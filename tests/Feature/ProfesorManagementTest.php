<?php

use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function profesorPayload(array $overrides = []): array
{
    return array_merge([
        'nombre' => 'Laura',
        'apellido_paterno' => 'Hernández',
        'apellido_materno' => 'Ruiz',
        'curp' => '',
        'fecha_nacimiento' => '1985-03-20',
        'telefono' => '2281234567',
        'email' => 'laura@example.com',
        'especialidad' => 'Barbería',
        'activo' => true,
        'crear_cuenta' => false,
        'password' => '',
        'password_confirmation' => '',
    ], $overrides);
}

test('guests are redirected to the login page', function () {
    $this->get('/profesores')->assertRedirect('/login');
});

test('profesores and alumnos cannot access the teachers module', function (string $rol) {
    $user = User::factory()->create();
    $user->assignRole($rol);
    $profesor = Profesor::factory()->create();

    $this->actingAs($user)->get('/profesores')->assertForbidden();
    $this->actingAs($user)->post('/profesores', profesorPayload())->assertForbidden();
    $this->actingAs($user)->delete("/profesores/{$profesor->id}")->assertForbidden();
})->with(['Profesor', 'Alumno']);

test('directors can view and register profesores without an account', function () {
    $director = User::factory()->create();
    $director->assignRole('Director');

    $this->actingAs($director)->get('/profesores')->assertOk();

    $this->actingAs($director)
        ->post('/profesores', profesorPayload(['curp' => 'hera850320mvzrrl01']))
        ->assertRedirect(route('profesores.index'));

    $profesor = Profesor::where('email', 'laura@example.com')->firstOrFail();

    expect($profesor->nombre_completo)->toBe('Laura Hernández Ruiz');
    expect($profesor->curp)->toBe('HERA850320MVZRRL01');
    expect($profesor->user_id)->toBeNull();
});

test('registering a profesor can create their login account with the Profesor role', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/profesores', profesorPayload([
            'crear_cuenta' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]))
        ->assertRedirect(route('profesores.index'));

    $profesor = Profesor::where('email', 'laura@example.com')->firstOrFail();

    expect($profesor->user)->not->toBeNull();
    expect($profesor->user->email)->toBe('laura@example.com');
    expect($profesor->user->name)->toBe('Laura Hernández Ruiz');
    expect($profesor->user->hasRole('Profesor'))->toBeTrue();
    expect(Hash::check('password', $profesor->user->password))->toBeTrue();
});

test('creating an account requires an unused email and a password', function () {
    $admin = actingAsAdmin();
    User::factory()->create(['email' => 'laura@example.com']);

    $this->actingAs($admin)
        ->post('/profesores', profesorPayload(['crear_cuenta' => true]))
        ->assertSessionHasErrors(['email', 'password']);

    $this->actingAs($admin)
        ->post('/profesores', profesorPayload(['crear_cuenta' => true, 'email' => '']))
        ->assertSessionHasErrors('email');

    expect(Profesor::count())->toBe(0);
});

test('updating a profesor keeps their account name, email and password in sync', function () {
    $admin = actingAsAdmin();
    $user = User::factory()->create(['email' => 'viejo@example.com']);
    $user->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $user->id, 'email' => 'viejo@example.com']);

    $this->actingAs($admin)->get("/profesores/{$profesor->id}/edit")->assertOk();

    $this->actingAs($admin)
        ->put("/profesores/{$profesor->id}", profesorPayload([
            'password' => 'nueva-clave-123',
            'password_confirmation' => 'nueva-clave-123',
        ]))
        ->assertRedirect(route('profesores.index'));

    $user->refresh();

    expect($profesor->fresh()->nombre)->toBe('Laura');
    expect($user->email)->toBe('laura@example.com');
    expect($user->name)->toBe('Laura Hernández Ruiz');
    expect(Hash::check('nueva-clave-123', $user->password))->toBeTrue();
});

test('an account can be created for an existing profesor', function () {
    $admin = actingAsAdmin();
    $profesor = Profesor::factory()->create();

    $this->actingAs($admin)
        ->put("/profesores/{$profesor->id}", profesorPayload([
            'crear_cuenta' => true,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]))
        ->assertRedirect(route('profesores.index'));

    expect($profesor->fresh()->user?->hasRole('Profesor'))->toBeTrue();
});

test('a profesor with active groups cannot be deleted', function () {
    $admin = actingAsAdmin();
    $profesor = Profesor::factory()->create();
    Grupo::factory()->create(['profesor_id' => $profesor->id, 'estado' => 'en_curso']);

    $this->actingAs($admin)
        ->delete("/profesores/{$profesor->id}")
        ->assertSessionHasErrors('profesor');

    expect($profesor->fresh()->trashed())->toBeFalse();
});

test('deleting a profesor removes the Profesor role from their account', function () {
    $admin = actingAsAdmin();
    $user = User::factory()->create();
    $user->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $user->id]);
    Grupo::factory()->create(['profesor_id' => $profesor->id, 'estado' => 'concluido']);

    $this->actingAs($admin)
        ->delete("/profesores/{$profesor->id}")
        ->assertRedirect(route('profesores.index'));

    expect($profesor->fresh()->trashed())->toBeTrue();
    expect($user->fresh()->hasRole('Profesor'))->toBeFalse();
    expect(User::find($user->id))->not->toBeNull();
});

test('a JPG photo can be uploaded when registering a profesor', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/profesores', profesorPayload(['foto' => UploadedFile::fake()->image('laura.jpg')]))
        ->assertRedirect(route('profesores.index'));

    $profesor = Profesor::where('email', 'laura@example.com')->firstOrFail();

    expect($profesor->foto)->toStartWith('profesores/');
    Storage::disk('public')->assertExists($profesor->foto);

    $this->actingAs($admin)
        ->get('/profesores')
        ->assertInertia(fn ($page) => $page->where('profesores.data.0.foto_url', $profesor->fotoUrl()));
});

test('the profesor photo must be a JPG or JPEG of at most 1.5 MB', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/profesores', profesorPayload(['foto' => UploadedFile::fake()->image('foto.png')]))
        ->assertSessionHasErrors(['foto' => 'La foto debe estar en formato JPG o JPEG.']);

    $this->actingAs($admin)
        ->post('/profesores', profesorPayload(['foto' => UploadedFile::fake()->image('foto.jpg')->size(1537)]))
        ->assertSessionHasErrors(['foto' => 'La foto no puede pesar más de 1.5 MB.']);

    expect(Profesor::count())->toBe(0);
});

test('editing a profesor can replace or remove the photo', function () {
    Storage::fake('public');
    $admin = actingAsAdmin();
    $original = UploadedFile::fake()->image('original.jpg')->store('profesores', 'public');
    $profesor = Profesor::factory()->create(['foto' => $original]);

    $this->actingAs($admin)
        ->post("/profesores/{$profesor->id}", profesorPayload(['_method' => 'put', 'foto' => UploadedFile::fake()->image('nueva.jpg')]))
        ->assertRedirect(route('profesores.index'));

    $nueva = $profesor->fresh()->foto;
    Storage::disk('public')->assertMissing($original);
    Storage::disk('public')->assertExists($nueva);

    $this->actingAs($admin)
        ->post("/profesores/{$profesor->id}", profesorPayload(['_method' => 'put', 'remove_foto' => true]))
        ->assertRedirect(route('profesores.index'));

    expect($profesor->fresh()->foto)->toBeNull();
    Storage::disk('public')->assertMissing($nueva);
});

test('the list shows each profesor\'s grupos, weekly hours, attendance and overdue roll calls, with tabs and a plantel filter', function () {
    $this->travelTo('2026-09-30 10:00');
    $rafaelLucio = Plantel::factory()->create();
    $tlacolulan = Plantel::factory()->create();

    $beatriz = Profesor::factory()->create(['apellido_paterno' => 'Aguilar']);
    // Sunday 9:00–12:00 for weeks, roll call 10 days ago: running and overdue.
    $barberia = Grupo::factory()->create([
        'profesor_id' => $beatriz->id, 'plantel_id' => $rafaelLucio->id, 'estado' => 'en_curso',
        'dias' => 'Dom', 'hora_inicio' => '09:00', 'hora_fin' => '12:00', 'fecha_inicio' => '2026-06-21',
    ]);
    $inscripcion = Inscripcion::factory()->create(['grupo_id' => $barberia->id, 'estado' => 'activo']);
    Inscripcion::factory()->create(['grupo_id' => $barberia->id, 'estado' => 'activo']);
    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => '2026-09-20', 'estado' => 'presente']);
    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => '2026-09-13', 'estado' => 'falta']);
    // Planned at the other plantel: listed, but not counted as weekly hours yet.
    Grupo::factory()->create([
        'profesor_id' => $beatriz->id, 'plantel_id' => $tlacolulan->id, 'estado' => 'planeado',
        'dias' => 'Sáb', 'hora_inicio' => '09:00', 'hora_fin' => '12:00', 'fecha_inicio' => '2026-10-24',
    ]);
    Grupo::factory()->create(['profesor_id' => $beatriz->id, 'plantel_id' => $rafaelLucio->id, 'estado' => 'concluido']);

    Profesor::factory()->create(['apellido_paterno' => 'Benítez']);
    Profesor::factory()->create(['apellido_paterno' => 'Cruz', 'activo' => false]);

    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->get('/profesores')
        ->assertInertia(fn ($page) => $page
            ->where('conteos', ['todos' => 3, 'con_grupos' => 1, 'sin_grupo' => 1, 'inactivos' => 1])
            ->has('profesores.data.0.grupos', 2)
            ->where('profesores.data.0.grupos.0.id', $barberia->id)
            ->where('profesores.data.0.grupos.0.dias', ['Dom'])
            ->where('profesores.data.0.grupos.0.lista_atrasada', true)
            ->where('profesores.data.0.grupos.0.dias_sin_lista', 10)
            ->where('profesores.data.0.estadisticas', ['alumnos' => 2, 'horas_semana' => 3, 'asistencia' => 50, 'listas_atrasadas' => 1]));

    $this->actingAs($admin)
        ->get("/profesores?plantel_id={$tlacolulan->id}")
        ->assertInertia(fn ($page) => $page
            ->has('profesores.data', 1)
            ->has('profesores.data.0.grupos', 1)
            ->where('profesores.data.0.grupos.0.estado', 'planeado'));

    $this->actingAs($admin)
        ->get('/profesores?situacion=inactivos')
        ->assertInertia(fn ($page) => $page->has('profesores.data', 1)->where('profesores.data.0.activo', false));
});

test('the edit form lists every grupo of the profesor and the cursos as specialty picks', function () {
    $profesor = Profesor::factory()->create();
    Grupo::factory()->create(['profesor_id' => $profesor->id, 'estado' => 'concluido']);
    $actual = Grupo::factory()->create(['profesor_id' => $profesor->id, 'estado' => 'en_curso']);
    Curso::factory()->create(['nombre' => 'Barbería', 'activo' => true]);
    Curso::factory()->create(['nombre' => 'Repostería', 'activo' => false]);

    $this->actingAs(actingAsAdmin())
        ->get("/profesores/{$profesor->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->has('grupos', 2)
            ->where('grupos.0.id', $actual->id)
            ->where('grupos.1.estado', 'concluido')
            ->where('especialidades', fn ($nombres) => in_array('Barbería', collect($nombres)->all(), true) && ! in_array('Repostería', collect($nombres)->all(), true)));
});
