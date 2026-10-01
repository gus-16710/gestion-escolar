<?php

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->plantel = Plantel::factory()->create(['clave' => 'SM']);
    $this->curso = Curso::factory()->create(['clave' => 'BAR']);
    $this->plantel->cursos()->attach($this->curso);
});

function grupoPayload(array $overrides = []): array
{
    return array_merge([
        'plantel_id' => Plantel::where('clave', 'SM')->value('id'),
        'curso_id' => Curso::where('clave', 'BAR')->value('id'),
        'profesor_id' => '',
        'clave' => '',
        'turno' => 'sabatino',
        'dias' => ['Sáb'],
        'hora_inicio' => '09:00',
        'hora_fin' => '14:00',
        'fecha_inicio' => '2026-10-03',
        'fecha_fin' => '2027-03-27',
        'cupo' => '2',
        'estado' => 'planeado',
    ], $overrides);
}

function profesorConCuenta(): array
{
    $user = User::factory()->create();
    $user->assignRole('Profesor');

    return [$user, Profesor::factory()->create(['user_id' => $user->id])];
}

test('guests are redirected to the login page', function () {
    $this->get('/grupos')->assertRedirect('/login');
});

test('alumnos cannot access the groups module', function () {
    $user = User::factory()->create();
    $user->assignRole('Alumno');

    $this->actingAs($user)->get('/grupos')->assertForbidden();
});

test('directors open a grupo with an auto-generated clave', function () {
    $director = directorDe($this->plantel);

    $this->actingAs($director)->get('/grupos/create')->assertOk();

    $this->actingAs($director)->post('/grupos', grupoPayload(['dias' => ['Sáb', 'Lun']]))->assertRedirect();
    $this->actingAs($director)->post('/grupos', grupoPayload())->assertRedirect();

    expect(Grupo::orderBy('id')->pluck('clave')->all())->toBe(['BAR-SM-2026-A', 'BAR-SM-2026-B']);

    $grupo = Grupo::where('clave', 'BAR-SM-2026-A')->firstOrFail();
    expect($grupo->dias)->toBe('Lun,Sáb');

    $this->actingAs($director)->get("/grupos/{$grupo->id}")->assertOk();
    $this->actingAs($director)->get("/grupos/{$grupo->id}/edit")->assertOk();
});

test('the curso must be offered at the selected plantel', function () {
    $admin = actingAsAdmin();
    $ingles = Curso::factory()->create();

    $this->actingAs($admin)
        ->post('/grupos', grupoPayload(['curso_id' => $ingles->id]))
        ->assertSessionHasErrors('curso_id');
});

test('inactive cursos are only offered for the grupo that already uses them', function () {
    $admin = actingAsAdmin();
    $this->curso->update(['activo' => false]);
    Curso::factory()->create(['nombre' => 'Inglés']);
    $grupo = Grupo::factory()->create(['plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id]);

    $this->actingAs($admin)
        ->get('/grupos/create')
        ->assertInertia(fn ($page) => $page->where('cursos', fn ($cursos) => collect($cursos)->pluck('nombre')->all() === ['Inglés']));

    $this->actingAs($admin)
        ->get("/grupos/{$grupo->id}/edit")
        ->assertInertia(fn ($page) => $page->has('cursos', 2));
});

test('grupo data is validated', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/grupos', grupoPayload(['turno' => 'nocturno', 'dias' => ['Xyz'], 'hora_fin' => '08:00', 'fecha_fin' => '2026-01-01']))
        ->assertSessionHasErrors(['turno', 'dias.0', 'hora_fin', 'fecha_fin']);
});

test('the cupo cannot be lowered below the enrolled alumnos', function () {
    $admin = actingAsAdmin();
    $grupo = Grupo::factory()->create(['plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'cupo' => 5]);
    Inscripcion::factory(3)->create(['grupo_id' => $grupo->id]);

    $this->actingAs($admin)
        ->put("/grupos/{$grupo->id}", grupoPayload(['clave' => $grupo->clave, 'cupo' => '2']))
        ->assertSessionHasErrors('cupo');

    $this->actingAs($admin)
        ->put("/grupos/{$grupo->id}", grupoPayload(['clave' => $grupo->clave, 'cupo' => '3', 'estado' => 'en_curso']))
        ->assertRedirect(route('grupos.show', $grupo));

    expect($grupo->fresh()->estado)->toBe('en_curso');
});

test('profesores only see and open their own grupos', function () {
    [$user, $profesor] = profesorConCuenta();
    $propio = Grupo::factory()->create(['profesor_id' => $profesor->id]);
    $ajeno = Grupo::factory()->create();

    $this->actingAs($user)
        ->get('/grupos')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('grupos/index')->has('grupos.data', 1)->where('grupos.data.0.id', $propio->id));

    $this->actingAs($user)->get("/grupos/{$propio->id}")->assertOk();
    $this->actingAs($user)->get("/grupos/{$ajeno->id}")->assertForbidden();
    $this->actingAs($user)->get('/grupos/create')->assertForbidden();
    $this->actingAs($user)->post("/grupos/{$propio->id}/inscripciones", ['alumno_id' => Alumno::factory()->create()->id])->assertForbidden();
});

test('alumnos are enrolled up to the cupo', function () {
    $admin = actingAsAdmin();
    $grupo = Grupo::factory()->create(['plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'cupo' => 2, 'estado' => 'planeado']);
    [$a, $b, $c] = Alumno::factory(3)->create();

    $this->actingAs($admin)->post("/grupos/{$grupo->id}/inscripciones", ['alumno_id' => $a->id])->assertSessionHasNoErrors();
    $this->actingAs($admin)->post("/grupos/{$grupo->id}/inscripciones", ['alumno_id' => $a->id])->assertSessionHasErrors('alumno_id');
    $this->actingAs($admin)->post("/grupos/{$grupo->id}/inscripciones", ['alumno_id' => $b->id])->assertSessionHasNoErrors();
    $this->actingAs($admin)->post("/grupos/{$grupo->id}/inscripciones", ['alumno_id' => $c->id])->assertSessionHasErrors('alumno_id');

    expect($grupo->alumnos()->pluck('alumnos.id')->sort()->values()->all())->toBe([$a->id, $b->id]);
    expect(Inscripcion::where('alumno_id', $a->id)->first()->inscrito_por)->toBe($admin->id);
});

test('alumnos cannot be enrolled in concluded grupos or while inactive', function () {
    $admin = actingAsAdmin();
    $concluido = Grupo::factory()->create(['estado' => 'concluido']);
    $abierto = Grupo::factory()->create(['estado' => 'en_curso']);

    $this->actingAs($admin)
        ->post("/grupos/{$concluido->id}/inscripciones", ['alumno_id' => Alumno::factory()->create()->id])
        ->assertSessionHasErrors('alumno_id');

    $this->actingAs($admin)
        ->post("/grupos/{$abierto->id}/inscripciones", ['alumno_id' => Alumno::factory()->create(['activo' => false])->id])
        ->assertSessionHasErrors('alumno_id');

    expect(Inscripcion::count())->toBe(0);
});

test('dropping an alumno frees their seat and they can be re-enrolled', function () {
    $admin = actingAsAdmin();
    $grupo = Grupo::factory()->create(['cupo' => 1, 'estado' => 'en_curso']);
    $inscripcion = Inscripcion::factory()->create(['grupo_id' => $grupo->id]);

    $this->actingAs($admin)
        ->patch("/inscripciones/{$inscripcion->id}/baja", ['motivo_baja' => 'Cambio de horario'])
        ->assertSessionHasNoErrors();

    $inscripcion->refresh();
    expect($inscripcion->estado)->toBe('baja');
    expect($inscripcion->motivo_baja)->toBe('Cambio de horario');
    expect($inscripcion->fecha_baja)->not->toBeNull();

    $this->actingAs($admin)
        ->post("/grupos/{$grupo->id}/inscripciones", ['alumno_id' => $inscripcion->alumno_id])
        ->assertSessionHasNoErrors();

    expect($inscripcion->fresh()->estado)->toBe('activo');
    expect($inscripcion->fresh()->fecha_baja)->toBeNull();
    expect(Inscripcion::count())->toBe(1);
});

test('a grupo with enrolled alumnos cannot be deleted', function () {
    $admin = actingAsAdmin();
    $grupo = Grupo::factory()->create();
    Inscripcion::factory()->create(['grupo_id' => $grupo->id]);

    $this->actingAs($admin)->delete("/grupos/{$grupo->id}")->assertSessionHasErrors('grupo');
    expect($grupo->fresh()->trashed())->toBeFalse();

    $grupo->inscripciones()->update(['estado' => 'baja']);

    $this->actingAs($admin)->delete("/grupos/{$grupo->id}")->assertRedirect(route('grupos.index'));
    expect($grupo->fresh()->trashed())->toBeTrue();
});

test('the grupo page and the roll call show alumno and profesor photos', function () {
    $admin = actingAsAdmin();
    $profesor = Profesor::factory()->create(['foto' => 'profesores/laura.jpg']);
    $grupo = Grupo::factory()->create([
        'profesor_id' => $profesor->id,
        'estado' => 'en_curso',
        'fecha_inicio' => now()->subWeek()->toDateString(),
    ]);
    $inscrito = Alumno::factory()->create(['foto' => 'alumnos/mariana.jpg']);
    Inscripcion::factory()->create(['grupo_id' => $grupo->id, 'alumno_id' => $inscrito->id]);
    $disponible = Alumno::factory()->create(['foto' => 'alumnos/pedro.jpg']);

    $this->actingAs($admin)
        ->get("/grupos/{$grupo->id}")
        ->assertInertia(fn ($page) => $page
            ->where('grupo.profesor_foto_url', $profesor->fotoUrl())
            ->where('inscripciones.0.foto_url', $inscrito->fotoUrl())
            ->where('alumnosDisponibles', fn ($alumnos) => collect($alumnos)->firstWhere('id', $disponible->id)['foto_url'] === $disponible->fotoUrl()));

    $this->actingAs($admin)
        ->get("/grupos/{$grupo->id}/asistencias")
        ->assertInertia(fn ($page) => $page->where('alumnos.0.foto_url', $inscrito->fotoUrl()));
});

test('the grupos list counts each estado and shows where every grupo stands', function () {
    $this->travelTo('2026-09-30 10:00');
    $admin = actingAsAdmin();
    $this->curso->update(['duracion_semanas' => 35]);

    Grupo::factory()->create([
        'plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'clave' => 'BAR-SM-2026-A',
        'estado' => 'en_curso', 'fecha_inicio' => '2026-06-21', 'fecha_fin' => null,
    ]);
    Grupo::factory()->create([
        'plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'clave' => 'BAR-SM-2026-B',
        'estado' => 'planeado', 'fecha_inicio' => '2026-10-24',
    ]);
    Grupo::factory()->create(['plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'estado' => 'concluido']);

    $this->actingAs($admin)
        ->get('/grupos?estado=en_curso')
        ->assertInertia(fn ($page) => $page
            ->where('conteos', ['planeado' => 1, 'en_curso' => 1, 'concluido' => 1, 'cancelado' => 0, 'todos' => 3])
            ->has('grupos.data', 1)
            // 21 Jun + 35 weeks; 30 Sep falls in week 15.
            ->where('grupos.data.0.fecha_fin', '2027-02-21')
            ->where('grupos.data.0.avance', ['semana' => 15, 'semanas' => 35, 'porcentaje' => 43])
            ->where('grupos.data.0.curso_clave', 'BAR'));

    $this->actingAs($admin)
        ->get('/grupos?estado=planeado')
        ->assertInertia(fn ($page) => $page->where('grupos.data.0.avance', ['dias_para_inicio' => 24]));
});

test('the grupo form suggests the profesores who already teach each curso and previews the clave', function () {
    $admin = actingAsAdmin();
    [, $profesor] = profesorConCuenta();
    Grupo::factory()->create([
        'plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'profesor_id' => $profesor->id, 'clave' => 'BAR-SM-2026-A',
    ]);

    $this->actingAs($admin)
        ->get('/grupos/create')
        ->assertInertia(fn ($page) => $page
            ->where('planteles.0.clave', 'SM')
            ->where('cursos.0.duracion_semanas', $this->curso->duracion_semanas)
            ->where('profesores', fn ($profesores) => collect($profesores)->firstWhere('id', $profesor->id)['curso_ids'] == [$this->curso->id])
            ->where('clavesUsadas', ['BAR-SM-2026-A']));
});

test('the grupo page shows each alumno\'s attendance and the grupo\'s health', function () {
    $this->travelTo('2026-09-30 10:00');
    $admin = actingAsAdmin();
    $grupo = Grupo::factory()->create([
        'plantel_id' => $this->plantel->id, 'curso_id' => $this->curso->id, 'estado' => 'en_curso', 'fecha_inicio' => '2026-08-01',
    ]);
    $inscripcion = Inscripcion::factory()->create(['grupo_id' => $grupo->id, 'estado' => 'activo']);

    foreach (['2026-09-20' => 'presente', '2026-09-22' => 'falta', '2026-09-25' => 'retardo', '2026-09-27' => 'presente'] as $fecha => $estado) {
        Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => $fecha, 'estado' => $estado]);
    }

    $this->actingAs($admin)
        ->get("/grupos/{$grupo->id}")
        ->assertInertia(fn ($page) => $page
            ->where('grupo.asistencia_30', 75)
            ->where('grupo.registros_30', 4)
            ->where('grupo.dias_sin_lista', 3)
            ->where('grupo.curso_clave', 'BAR')
            ->where('inscripciones.0.asistencia', ['porcentaje' => 75, 'registros' => 4, 'faltas' => 1, 'retardos' => 1]));
});

test('the grupo page lays the curso\'s modules over its calendar', function () {
    $this->travelTo('2026-10-01 10:00');
    $curso = Curso::factory()->create();
    $curso->modulos()->create(['orden' => 1, 'nombre' => 'Fundamentos', 'duracion_semanas' => 4]);
    $curso->modulos()->create(['orden' => 2, 'nombre' => 'Técnicas', 'duracion_semanas' => 10]);
    $curso->modulos()->create(['orden' => 3, 'nombre' => 'Proyecto', 'duracion_semanas' => 2]);
    $grupo = Grupo::factory()->create(['curso_id' => $curso->id, 'estado' => 'en_curso', 'fecha_inicio' => '2026-08-02']);

    $this->actingAs(actingAsAdmin())
        ->get("/grupos/{$grupo->id}")
        ->assertInertia(fn ($page) => $page
            ->has('modulos', 3)
            ->where('modulos.0.inicio', '2026-08-02')
            ->where('modulos.0.fin', '2026-08-29')
            ->where('modulos.0.estado', 'terminado')
            ->where('modulos.1.inicio', '2026-08-30')
            ->where('modulos.1.fin', '2026-11-07')
            ->where('modulos.1.estado', 'actual')
            ->where('modulos.2.inicio', '2026-11-08')
            ->where('modulos.2.estado', 'proximo')
            ->where('canEditCurso', true));

    // A planned grupo has every module ahead; a concluded one has them all finished.
    $grupo->update(['estado' => 'planeado', 'fecha_inicio' => '2026-10-24']);
    $this->get("/grupos/{$grupo->id}")->assertInertia(fn ($page) => $page->where('modulos.0.estado', 'proximo'));

    $grupo->update(['estado' => 'concluido', 'fecha_inicio' => '2026-09-01']);
    $this->get("/grupos/{$grupo->id}")->assertInertia(fn ($page) => $page->where('modulos.2.estado', 'terminado'));
});

test('a grupo whose curso has no study plan still opens', function () {
    $grupo = Grupo::factory()->create();

    $this->actingAs(actingAsAdmin())
        ->get("/grupos/{$grupo->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('modulos', []));
});
