<?php

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->sanMiguel = Plantel::factory()->create(['clave' => 'SM']);
});

function alumnoPayload(array $overrides = []): array
{
    return array_merge([
        'nombre' => 'Mariana',
        'apellido_paterno' => 'López',
        'apellido_materno' => 'Castro',
        'curp' => '',
        'fecha_nacimiento' => '2004-07-11',
        'genero' => 'femenino',
        'telefono' => '2289876543',
        'email' => 'mariana@example.com',
        'direccion' => 'Calle Hidalgo 5',
        'contacto_emergencia_nombre' => 'Rosa Castro (madre)',
        'contacto_emergencia_telefono' => '2281112233',
        'activo' => true,
        'crear_cuenta' => false,
        'password' => '',
        'password_confirmation' => '',
    ], $overrides);
}

test('guests are redirected to the login page', function () {
    $this->get('/alumnos')->assertRedirect('/login');
});

test('alumnos cannot access the students module', function () {
    $user = User::factory()->create();
    $user->assignRole('Alumno');

    $this->actingAs($user)->get('/alumnos')->assertForbidden();
});

test('profesores can view the list but cannot manage alumnos', function () {
    $profesor = User::factory()->create();
    $profesor->assignRole('Profesor');
    $alumno = Alumno::factory()->create();

    $this->actingAs($profesor)->get('/alumnos')->assertOk();
    $this->actingAs($profesor)->get('/alumnos/create')->assertForbidden();
    $this->actingAs($profesor)->post('/alumnos', alumnoPayload())->assertForbidden();
    $this->actingAs($profesor)->put("/alumnos/{$alumno->id}", alumnoPayload())->assertForbidden();
    $this->actingAs($profesor)->delete("/alumnos/{$alumno->id}")->assertForbidden();
});

test('directors register alumnos with a school-wide matrícula per year, without a plantel', function () {
    $director = directorDe($this->sanMiguel);
    $year = now()->year;

    $this->actingAs($director)->get('/alumnos/create')->assertOk()->assertInertia(fn ($page) => $page->missing('planteles'));

    $this->actingAs($director)->post('/alumnos', alumnoPayload())->assertRedirect(route('alumnos.index'));
    $this->actingAs($director)->post('/alumnos', alumnoPayload(['email' => 'otro@example.com']))->assertRedirect();

    expect(Alumno::orderBy('id')->pluck('matricula')->all())->toBe(["{$year}-0001", "{$year}-0002"]);

    $alumno = Alumno::where('email', 'mariana@example.com')->firstOrFail();
    expect($alumno->nombre_completo)->toBe('Mariana López Castro');
    expect($alumno->user_id)->toBeNull();
});

test('matrícula numbers are never reused after a deletion', function () {
    $year = now()->year;
    Alumno::factory()->create(['matricula' => "{$year}-0007"])->delete();

    expect(Alumno::siguienteMatricula())->toBe("{$year}-0008");
});

test('older plantel-prefixed matrículas do not affect the new sequence', function () {
    $year = now()->year;
    Alumno::factory()->create(['matricula' => "SM-{$year}-0005"]);
    Alumno::factory()->create(['matricula' => "A{$year}0009"]);

    expect(Alumno::siguienteMatricula())->toBe("{$year}-0001");
});

test('registering an alumno can create their login account with the Alumno role', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/alumnos', alumnoPayload([
            'crear_cuenta' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]))
        ->assertRedirect(route('alumnos.index'));

    $alumno = Alumno::where('email', 'mariana@example.com')->firstOrFail();

    expect($alumno->user->hasRole('Alumno'))->toBeTrue();
    expect($alumno->user->name)->toBe('Mariana López Castro');
    expect(Hash::check('password', $alumno->user->password))->toBeTrue();
});

test('updating an alumno keeps the matrícula and syncs their account', function () {
    $admin = actingAsAdmin();
    $user = User::factory()->create(['email' => 'viejo@example.com']);
    $user->assignRole('Alumno');
    $alumno = Alumno::factory()->create(['user_id' => $user->id, 'email' => 'viejo@example.com', 'matricula' => 'SM-2026-0042']);

    $this->actingAs($admin)->get("/alumnos/{$alumno->id}/edit")->assertOk();

    $this->actingAs($admin)
        ->put("/alumnos/{$alumno->id}", alumnoPayload(['curp' => 'loca040711mvzpsr09']))
        ->assertRedirect(route('alumnos.index'));

    $alumno->refresh();

    expect($alumno->matricula)->toBe('SM-2026-0042');
    expect($alumno->curp)->toBe('LOCA040711MVZPSR09');
    expect($alumno->user->email)->toBe('mariana@example.com');
    expect($alumno->user->name)->toBe('Mariana López Castro');
});

test('an alumno with active enrollments cannot be deleted', function () {
    $admin = actingAsAdmin();
    $inscripcion = Inscripcion::factory()->create(['estado' => 'activo']);

    $this->actingAs($admin)
        ->delete("/alumnos/{$inscripcion->alumno_id}")
        ->assertSessionHasErrors('alumno');

    expect($inscripcion->alumno->fresh()->trashed())->toBeFalse();
});

test('deleting an alumno removes the Alumno role from their account', function () {
    $admin = actingAsAdmin();
    $user = User::factory()->create();
    $user->assignRole('Alumno');
    $alumno = Alumno::factory()->create(['user_id' => $user->id]);
    Inscripcion::factory()->create(['alumno_id' => $alumno->id, 'estado' => 'egresado']);

    $this->actingAs($admin)
        ->delete("/alumnos/{$alumno->id}")
        ->assertRedirect(route('alumnos.index'));

    expect($alumno->fresh()->trashed())->toBeTrue();
    expect($user->fresh()->hasRole('Alumno'))->toBeFalse();
});

test('a JPG photo can be uploaded when registering an alumno', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/alumnos', alumnoPayload(['foto' => UploadedFile::fake()->image('mariana.jpg')->size(1200)]))
        ->assertRedirect(route('alumnos.index'));

    $alumno = Alumno::where('email', 'mariana@example.com')->firstOrFail();

    expect($alumno->foto)->toStartWith('alumnos/');
    expect($alumno->fotoUrl())->toEndWith("storage/{$alumno->foto}");
    Storage::disk('public')->assertExists($alumno->foto);
});

test('the photo must be a JPG or JPEG of at most 1.5 MB', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/alumnos', alumnoPayload(['foto' => UploadedFile::fake()->image('foto.png')]))
        ->assertSessionHasErrors(['foto' => 'La foto debe estar en formato JPG o JPEG.']);

    $this->actingAs($admin)
        ->post('/alumnos', alumnoPayload(['foto' => UploadedFile::fake()->image('foto.jpg')->size(1537)]))
        ->assertSessionHasErrors(['foto' => 'La foto no puede pesar más de 1.5 MB.']);

    $this->actingAs($admin)
        ->post('/alumnos', alumnoPayload(['foto' => UploadedFile::fake()->image('foto.jpeg')->size(1536)]))
        ->assertSessionHasNoErrors();

    expect(Alumno::count())->toBe(1);
});

test('editing an alumno can replace or remove the photo', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();
    $original = UploadedFile::fake()->image('original.jpg')->store('alumnos', 'public');
    $alumno = Alumno::factory()->create(['foto' => $original]);

    $this->actingAs($admin)->get("/alumnos/{$alumno->id}/edit")->assertOk();

    // Uploads arrive as a POST spoofing PUT, exactly as the edit page sends them.
    $this->actingAs($admin)
        ->post("/alumnos/{$alumno->id}", alumnoPayload(['_method' => 'put', 'foto' => UploadedFile::fake()->image('nueva.jpg')]))
        ->assertRedirect(route('alumnos.index'));

    $nueva = $alumno->fresh()->foto;
    expect($nueva)->not->toBe($original);
    Storage::disk('public')->assertMissing($original);
    Storage::disk('public')->assertExists($nueva);

    $this->actingAs($admin)
        ->post("/alumnos/{$alumno->id}", alumnoPayload(['_method' => 'put', 'remove_foto' => true]))
        ->assertRedirect(route('alumnos.index'));

    expect($alumno->fresh()->foto)->toBeNull();
    Storage::disk('public')->assertMissing($nueva);
});

test('editing an alumno without touching the photo keeps it', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();
    $foto = UploadedFile::fake()->image('original.jpg')->store('alumnos', 'public');
    $alumno = Alumno::factory()->create(['foto' => $foto]);

    $this->actingAs($admin)
        ->post("/alumnos/{$alumno->id}", alumnoPayload(['_method' => 'put', 'remove_foto' => false]))
        ->assertRedirect(route('alumnos.index'));

    expect($alumno->fresh()->foto)->toBe($foto);
    Storage::disk('public')->assertExists($foto);
});

/** Gives the enrollment a run of roll calls with the given number of absences. */
function pasesDeLista(Inscripcion $inscripcion, int $total, int $faltas): void
{
    foreach (range(1, $total) as $dia) {
        Asistencia::create([
            'inscripcion_id' => $inscripcion->id,
            'fecha' => now()->subDays($dia)->toDateString(),
            'estado' => $dia <= $faltas ? 'falta' : 'presente',
        ]);
    }
}

test('the list has situación tabs, plantel and curso filters, and each course\'s attendance', function () {
    $tlacolulan = Plantel::factory()->create(['clave' => 'TL']);
    $barberia = Curso::factory()->create(['clave' => 'BAR']);
    $ingles = Curso::factory()->create(['clave' => 'ING']);
    $grupoSm = Grupo::factory()->create(['plantel_id' => $this->sanMiguel->id, 'curso_id' => $barberia->id, 'estado' => 'en_curso']);
    $grupoTl = Grupo::factory()->create(['plantel_id' => $tlacolulan->id, 'curso_id' => $ingles->id, 'estado' => 'en_curso']);
    $concluido = Grupo::factory()->create(['plantel_id' => $this->sanMiguel->id, 'curso_id' => $ingles->id, 'estado' => 'concluido']);

    // 75% over 4 classes: at risk. 80% over 5: not (the threshold is "under 80"). 0% over 2: too few classes yet.
    $riesgo = Alumno::factory()->create(['apellido_paterno' => 'Aguilar']);
    pasesDeLista(Inscripcion::factory()->create(['alumno_id' => $riesgo->id, 'grupo_id' => $grupoSm->id, 'estado' => 'activo']), 4, 1);
    $limite = Alumno::factory()->create(['apellido_paterno' => 'Benítez']);
    pasesDeLista(Inscripcion::factory()->create(['alumno_id' => $limite->id, 'grupo_id' => $grupoTl->id, 'estado' => 'activo']), 5, 1);
    $nuevo = Alumno::factory()->create(['apellido_paterno' => 'Cruz']);
    pasesDeLista(Inscripcion::factory()->create(['alumno_id' => $nuevo->id, 'grupo_id' => $grupoSm->id, 'estado' => 'activo']), 2, 2);
    // A finished grupo with poor attendance doesn't count as a risk any more.
    $egresado = Alumno::factory()->create(['apellido_paterno' => 'Díaz']);
    pasesDeLista(Inscripcion::factory()->create(['alumno_id' => $egresado->id, 'grupo_id' => $concluido->id, 'estado' => 'activo']), 4, 3);
    Alumno::factory()->create(['apellido_paterno' => 'Estrada']);
    Alumno::factory()->create(['apellido_paterno' => 'Flores', 'activo' => false]);

    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->get('/alumnos')
        ->assertInertia(fn ($page) => $page
            ->where('conteos', ['todos' => 6, 'inscritos' => 4, 'sin_grupo' => 1, 'en_riesgo' => 1, 'inactivos' => 1])
            ->where('alumnos.data.0.cursos.0.curso_clave', 'BAR')
            ->where('alumnos.data.0.cursos.0.plantel_clave', 'SM')
            ->where('alumnos.data.0.cursos.0.asistencia', ['porcentaje' => 75, 'registros' => 4, 'faltas' => 1, 'en_riesgo' => true])
            ->where('alumnos.data.1.cursos.0.asistencia.en_riesgo', false)
            ->where('alumnos.data.2.cursos.0.asistencia.en_riesgo', false));

    $this->actingAs($admin)
        ->get('/alumnos?situacion=en_riesgo')
        ->assertInertia(fn ($page) => $page->has('alumnos.data', 1)->where('alumnos.data.0.id', $riesgo->id));

    $this->actingAs($admin)
        ->get("/alumnos?plantel_id={$tlacolulan->id}")
        ->assertInertia(fn ($page) => $page->has('alumnos.data', 1)->where('alumnos.data.0.id', $limite->id)->where('conteos.todos', 1));

    $this->actingAs($admin)
        ->get("/alumnos?curso_id={$ingles->id}")
        ->assertInertia(fn ($page) => $page->has('alumnos.data', 2)->where('alumnos.data.1.id', $egresado->id));
});

test('the register form previews the matrícula and the edit form lists the alumno\'s courses', function () {
    $this->travelTo('2026-09-30 10:00');
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->get('/alumnos/create')
        ->assertInertia(fn ($page) => $page->where('matriculaPrevista', '2026-0001'));

    $alumno = Alumno::factory()->create();
    $actual = Inscripcion::factory()->create(['alumno_id' => $alumno->id, 'estado' => 'activo', 'fecha_inscripcion' => '2026-06-01']);
    pasesDeLista($actual, 3, 0);
    Inscripcion::factory()->create(['alumno_id' => $alumno->id, 'estado' => 'baja', 'fecha_inscripcion' => '2026-07-01', 'fecha_baja' => '2026-08-01']);

    $this->actingAs($admin)
        ->get("/alumnos/{$alumno->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->has('inscripciones', 2)
            ->where('inscripciones.0.inscripcion_id', $actual->id)
            ->where('inscripciones.0.asistencia.porcentaje', 100)
            ->where('inscripciones.1.estado', 'baja')
            ->where('inscripciones.1.fecha_baja', '2026-08-01'));
});
