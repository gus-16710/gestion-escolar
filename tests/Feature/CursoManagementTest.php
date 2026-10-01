<?php

use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function cursoPayload(array $overrides = []): array
{
    return array_merge([
        'nombre' => 'Barbería',
        'clave' => 'bar',
        'descripcion' => 'Cortes clásicos y modernos.',
        'duracion_semanas' => '24',
        'activo' => true,
        'planteles' => [],
    ], $overrides);
}

test('guests are redirected to the login page', function () {
    $this->get('/cursos')->assertRedirect('/login');
});

test('users without view courses permission cannot see the list', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/cursos')->assertForbidden();
});

test('profesores and alumnos can view the catalog but cannot manage it', function (string $rol) {
    $user = User::factory()->create();
    $user->assignRole($rol);
    $curso = Curso::factory()->create();

    $this->actingAs($user)->get('/cursos')->assertOk();
    $this->actingAs($user)->get('/cursos/create')->assertForbidden();
    $this->actingAs($user)->post('/cursos', cursoPayload())->assertForbidden();
    $this->actingAs($user)->put("/cursos/{$curso->id}", cursoPayload())->assertForbidden();
    $this->actingAs($user)->delete("/cursos/{$curso->id}")->assertForbidden();
})->with(['Profesor', 'Alumno']);

test('directors can view the catalog but cannot manage cursos', function () {
    $sanMiguel = Plantel::factory()->create(['nombre' => 'CICCIS San Miguel']);
    $director = directorDe($sanMiguel);
    $curso = Curso::factory()->create();

    $this->actingAs($director)
        ->get('/cursos')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canManage', false));
    $this->actingAs($director)->get('/cursos/create')->assertForbidden();
    $this->actingAs($director)->post('/cursos', cursoPayload(['planteles' => [$sanMiguel->id]]))->assertForbidden();
    $this->actingAs($director)->put("/cursos/{$curso->id}", cursoPayload())->assertForbidden();
    $this->actingAs($director)->delete("/cursos/{$curso->id}")->assertForbidden();
});

test('admins can create a curso offered at planteles', function () {
    $sanMiguel = Plantel::factory()->create(['nombre' => 'CICCIS San Miguel']);
    Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan']);

    $this->actingAs(actingAsAdmin())
        ->post('/cursos', cursoPayload(['planteles' => [(string) $sanMiguel->id]]))
        ->assertRedirect(route('cursos.index'));

    $curso = Curso::where('clave', 'BAR')->firstOrFail();

    expect($curso->nombre)->toBe('Barbería');
    expect($curso->duracion_semanas)->toBe(24);
    expect($curso->planteles->pluck('id')->all())->toBe([$sanMiguel->id]);
});

test('admins can update a curso and its planteles', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    $tlacolulan = Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan']);
    $anterior = Plantel::factory()->create();
    $curso->planteles()->attach($anterior);

    $this->actingAs($admin)
        ->get("/cursos/{$curso->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('curso.planteles', [(string) $anterior->id])
            ->has('planteles', 2));

    $this->actingAs($admin)
        ->put("/cursos/{$curso->id}", cursoPayload([
            'clave' => $curso->clave,
            'duracion_semanas' => '',
            'activo' => false,
            'planteles' => [(string) $tlacolulan->id],
        ]))
        ->assertRedirect(route('cursos.index'));

    $curso->refresh();

    expect($curso->nombre)->toBe('Barbería');
    expect($curso->duracion_semanas)->toBeNull();
    expect($curso->activo)->toBeFalse();
    expect($curso->planteles->pluck('id')->all())->toBe([$tlacolulan->id]);
});

test('curso data is validated', function () {
    $admin = actingAsAdmin();
    Curso::factory()->create(['nombre' => 'Barbería', 'clave' => 'BAR']);

    $this->actingAs($admin)
        ->post('/cursos', cursoPayload(['duracion_semanas' => '0', 'planteles' => [999]]))
        ->assertSessionHasErrors(['nombre', 'clave', 'duracion_semanas', 'planteles.0']);
});

test('a plantel cannot stop offering a curso while it has active groups of it there', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    $rafaelLucio = Plantel::factory()->create(['nombre' => 'CICCIS Rafael Lucio']);
    $tlacolulan = Plantel::factory()->create();
    $curso->planteles()->attach([$rafaelLucio->id, $tlacolulan->id]);
    Grupo::factory()->create(['curso_id' => $curso->id, 'plantel_id' => $rafaelLucio->id, 'estado' => 'en_curso']);

    $this->actingAs($admin)
        ->put("/cursos/{$curso->id}", cursoPayload(['clave' => $curso->clave, 'planteles' => [$tlacolulan->id]]))
        ->assertSessionHasErrors(['planteles' => 'No puedes quitar CICCIS Rafael Lucio: tiene 1 grupo(s) de este curso planeados o en curso.']);

    expect($curso->planteles()->count())->toBe(2);
});

test('a plantel can stop offering a curso once its groups there have ended', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    $plantel = Plantel::factory()->create();
    $curso->planteles()->attach($plantel);
    Grupo::factory()->create(['curso_id' => $curso->id, 'plantel_id' => $plantel->id, 'estado' => 'concluido']);

    $this->actingAs($admin)
        ->put("/cursos/{$curso->id}", cursoPayload(['clave' => $curso->clave, 'planteles' => []]))
        ->assertRedirect(route('cursos.index'));

    expect($curso->planteles()->count())->toBe(0);
});

test('a curso without active groups can be deleted', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    Grupo::factory()->create(['curso_id' => $curso->id, 'estado' => 'concluido']);

    $this->actingAs($admin)
        ->delete("/cursos/{$curso->id}")
        ->assertRedirect(route('cursos.index'));

    expect($curso->fresh()->trashed())->toBeTrue();
});

test('a curso with active groups cannot be deleted', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    Grupo::factory()->create(['curso_id' => $curso->id, 'estado' => 'planeado']);

    $this->actingAs($admin)
        ->delete("/cursos/{$curso->id}")
        ->assertSessionHasErrors('curso');

    expect($curso->fresh()->trashed())->toBeFalse();
});

test('the catalog shows counts per tab and, for staff, each curso\'s grupos and alumnos within reach', function () {
    $rafaelLucio = Plantel::factory()->create(['nombre' => 'CICCIS Rafael Lucio', 'clave' => 'RL']);
    $tlacolulan = Plantel::factory()->create(['clave' => 'TL']);
    $barberia = Curso::factory()->create(['nombre' => 'Barbería', 'activo' => true]);
    Curso::factory()->create(['nombre' => 'Repostería', 'activo' => false]);
    $barberia->planteles()->attach([$rafaelLucio->id, $tlacolulan->id]);

    $enCurso = Grupo::factory()->create(['curso_id' => $barberia->id, 'plantel_id' => $rafaelLucio->id, 'estado' => 'en_curso']);
    Inscripcion::factory()->count(2)->create(['grupo_id' => $enCurso->id, 'estado' => 'activo']);
    Inscripcion::factory()->create(['grupo_id' => $enCurso->id, 'estado' => 'baja']);
    $otro = Grupo::factory()->create(['curso_id' => $barberia->id, 'plantel_id' => $tlacolulan->id, 'estado' => 'planeado']);
    Inscripcion::factory()->create(['grupo_id' => $otro->id, 'estado' => 'activo']);
    $concluido = Grupo::factory()->create(['curso_id' => $barberia->id, 'plantel_id' => $rafaelLucio->id, 'estado' => 'concluido']);
    Inscripcion::factory()->create(['grupo_id' => $concluido->id, 'estado' => 'activo']);

    $this->actingAs(actingAsAdmin())
        ->get('/cursos?estado=activos')
        ->assertInertia(fn ($page) => $page
            ->where('conteos', ['todos' => 2, 'activos' => 1, 'inactivos' => 1])
            ->has('cursos.data', 1)
            ->where('cursos.data.0.planteles.0', ['nombre' => 'CICCIS Rafael Lucio', 'clave' => 'RL'])
            ->where('cursos.data.0.estadisticas', ['grupos_en_curso' => 1, 'grupos_planeados' => 1, 'alumnos' => 3]));

    // A director only counts the grupos of their own planteles.
    $this->actingAs(directorDe($rafaelLucio))
        ->get('/cursos?estado=activos')
        ->assertInertia(fn ($page) => $page
            ->where('canViewGroups', true)
            ->where('cursos.data.0.estadisticas', ['grupos_en_curso' => 1, 'grupos_planeados' => 0, 'alumnos' => 2]));

    $profesor = User::factory()->create();
    $profesor->assignRole('Profesor');

    $this->actingAs($profesor)
        ->get('/cursos')
        ->assertInertia(fn ($page) => $page
            ->where('canViewGroups', false)
            ->where('cursos.data.0.estadisticas', null));
});

test('the edit form knows the curso\'s grupos, which planteles are locked and the claves in use', function () {
    $curso = Curso::factory()->create(['clave' => 'BAR']);
    Curso::factory()->create(['nombre' => 'Inglés', 'clave' => 'ING'])->delete();
    $rafaelLucio = Plantel::factory()->create();
    $tlacolulan = Plantel::factory()->create();
    $curso->planteles()->attach([$rafaelLucio->id, $tlacolulan->id]);
    $grupo = Grupo::factory()->create(['curso_id' => $curso->id, 'plantel_id' => $rafaelLucio->id, 'estado' => 'en_curso']);
    Inscripcion::factory()->create(['grupo_id' => $grupo->id, 'estado' => 'activo']);
    Grupo::factory()->create(['curso_id' => $curso->id, 'plantel_id' => $tlacolulan->id, 'estado' => 'concluido']);

    $this->actingAs(actingAsAdmin())
        ->get("/cursos/{$curso->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->where('resumen', ['planeado' => 0, 'en_curso' => 1, 'concluido' => 1, 'cancelado' => 0, 'alumnos' => 1])
            ->where('planteles', fn ($planteles) => collect($planteles)->pluck('grupos_activos', 'id')->sortKeys()->all()
                == [$rafaelLucio->id => 1, $tlacolulan->id => 0])
            ->where('clavesUsadas', ['ING' => 'Inglés']));
});

test('a curso is created with its study plan in order', function () {
    $this->actingAs(actingAsAdmin())
        ->post('/cursos', cursoPayload(['modulos' => [
            ['id' => null, 'nombre' => 'Fundamentos de corte', 'duracion_semanas' => '8', 'descripcion' => 'Herramientas y técnica básica.'],
            ['id' => null, 'nombre' => 'Barba y afeitado', 'duracion_semanas' => '6', 'descripcion' => ''],
        ]]))
        ->assertRedirect(route('cursos.index'));

    $modulos = Curso::where('clave', 'BAR')->firstOrFail()->modulos;

    expect($modulos->pluck('nombre')->all())->toBe(['Fundamentos de corte', 'Barba y afeitado']);
    expect($modulos->pluck('orden')->all())->toBe([1, 2]);
    expect($modulos->pluck('duracion_semanas')->all())->toBe([8, 6]);
    expect($modulos->last()->descripcion)->toBeNull();
});

test('editing the study plan renames, reorders, adds and removes modules, keeping the ids of those that stay', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    $primero = $curso->modulos()->create(['orden' => 1, 'nombre' => 'Uno', 'duracion_semanas' => 4]);
    $segundo = $curso->modulos()->create(['orden' => 2, 'nombre' => 'Dos', 'duracion_semanas' => 4]);
    $tercero = $curso->modulos()->create(['orden' => 3, 'nombre' => 'Tres', 'duracion_semanas' => 4]);

    $this->actingAs($admin)
        ->get("/cursos/{$curso->id}/edit")
        ->assertInertia(fn ($page) => $page->has('curso.modulos', 3)->where('curso.modulos.0.nombre', 'Uno'));

    // Swap the first two (names included), drop the third, add a new one at the end.
    $this->actingAs($admin)
        ->put("/cursos/{$curso->id}", cursoPayload(['clave' => $curso->clave, 'modulos' => [
            ['id' => $segundo->id, 'nombre' => 'Uno', 'duracion_semanas' => '5'],
            ['id' => $primero->id, 'nombre' => 'Dos', 'duracion_semanas' => '4'],
            ['id' => null, 'nombre' => 'Cuatro', 'duracion_semanas' => '2'],
        ]]))
        ->assertRedirect(route('cursos.index'));

    $modulos = $curso->modulos()->get();

    expect($modulos->pluck('id')->take(2)->all())->toBe([$segundo->id, $primero->id]);
    expect($modulos->pluck('nombre')->all())->toBe(['Uno', 'Dos', 'Cuatro']);
    expect($modulos->pluck('orden')->all())->toBe([1, 2, 3]);
    expect($modulos->first()->duracion_semanas)->toBe(5);
    expect($tercero->fresh())->toBeNull();

    // Sending no modules clears the plan.
    $this->actingAs($admin)->put("/cursos/{$curso->id}", cursoPayload(['clave' => $curso->clave, 'modulos' => []]));

    expect($curso->modulos()->count())->toBe(0);
});

test('the study plan is validated', function () {
    $admin = actingAsAdmin();
    $curso = Curso::factory()->create();
    $ajeno = Curso::factory()->create()->modulos()->create(['orden' => 1, 'nombre' => 'Ajeno', 'duracion_semanas' => 2]);

    $this->actingAs($admin)
        ->put("/cursos/{$curso->id}", cursoPayload(['clave' => $curso->clave, 'modulos' => [
            ['id' => null, 'nombre' => 'Repetido', 'duracion_semanas' => '0'],
            ['id' => null, 'nombre' => 'repetido', 'duracion_semanas' => '3'],
            ['id' => $ajeno->id, 'nombre' => 'Otro', 'duracion_semanas' => '3'],
            ['id' => null, 'nombre' => '', 'duracion_semanas' => '3'],
        ]]))
        ->assertSessionHasErrors(['modulos.0.duracion_semanas', 'modulos.1.nombre', 'modulos.2.id', 'modulos.3.nombre']);

    expect($ajeno->fresh()->curso_id)->not->toBe($curso->id);
});

test('the catalog lists each curso\'s modules', function () {
    $curso = Curso::factory()->create();
    $curso->modulos()->create(['orden' => 2, 'nombre' => 'Segundo', 'duracion_semanas' => 3]);
    $curso->modulos()->create(['orden' => 1, 'nombre' => 'Primero', 'duracion_semanas' => 5]);

    $this->actingAs(actingAsAdmin())
        ->get('/cursos')
        ->assertInertia(fn ($page) => $page->where('cursos.data.0.modulos', [
            ['nombre' => 'Primero', 'duracion_semanas' => 5],
            ['nombre' => 'Segundo', 'duracion_semanas' => 3],
        ]));
});
