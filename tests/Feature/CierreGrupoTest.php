<?php

use App\Models\Calificacion;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->travelTo('2026-10-01 10:00');

    $this->profesorUser = User::factory()->create();
    $this->profesorUser->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $this->profesorUser->id]);

    $this->curso = Curso::factory()->create(['duracion_semanas' => 8]);
    [$this->m1, $this->m2] = collect([['Teoría', 4], ['Práctica', 4]])
        ->map(fn ($datos, $i) => $this->curso->modulos()->create(['orden' => $i + 1, 'nombre' => $datos[0], 'duracion_semanas' => $datos[1]]))
        ->all();

    $this->grupo = Grupo::factory()->create([
        'curso_id' => $this->curso->id,
        'profesor_id' => $profesor->id,
        'dias' => 'Dom',
        'estado' => 'en_curso',
        'fecha_inicio' => '2026-08-02',
        'fecha_fin' => '2026-09-27',
    ]);

    // a: averages 8.5; b: failed module 2 and retook it (6 + 4→7 = 6.5); c: averages 5; baja: dropped.
    [$this->a, $this->b, $this->c] = Inscripcion::factory(3)->create(['grupo_id' => $this->grupo->id]);
    $this->baja = Inscripcion::factory()->create(['grupo_id' => $this->grupo->id, 'estado' => 'baja', 'fecha_baja' => '2026-08-20']);

    $this->calificar = function (Inscripcion $inscripcion, float $m1, ?float $m2, ?float $recuperacion = null) {
        Calificacion::create(['inscripcion_id' => $inscripcion->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => $m1, 'fecha_evaluacion' => '2026-08-29']);

        if ($m2 !== null) {
            Calificacion::create([
                'inscripcion_id' => $inscripcion->id, 'curso_modulo_id' => $this->m2->id, 'calificacion' => $m2, 'fecha_evaluacion' => '2026-09-26',
                'recuperacion' => $recuperacion, 'fecha_recuperacion' => $recuperacion ? '2026-09-30' : null,
            ]);
        }
    };
});

test('the review lists each alumno\'s result and the grades still missing', function () {
    ($this->calificar)($this->a, 8, 9);
    ($this->calificar)($this->b, 6, null);

    $this->actingAs(actingAsAdmin())
        ->get("/grupos/{$this->grupo->id}/cierre")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('grupos/cierre')
            ->has('alumnos', 3)
            ->where('totales', ['egresados' => 1, 'no_acreditados' => 0, 'incompletos' => 2, 'promedio' => 8.5])
            ->where('alumnos', fn ($alumnos) => collect($alumnos)->firstWhere('inscripcion_id', $this->b->id)['faltantes'][0]['nombre'] === 'Práctica'));

    $this->post("/grupos/{$this->grupo->id}/cierre")->assertSessionHasErrors('cierre');

    expect($this->grupo->fresh()->estado)->toBe('en_curso');
});

test('concluding sets each alumno\'s result and freezes the grupo', function () {
    ($this->calificar)($this->a, 8, 9);
    ($this->calificar)($this->b, 6, 4, 7);
    ($this->calificar)($this->c, 5, 5);
    $admin = actingAsAdmin();

    $this->actingAs($admin)->post("/grupos/{$this->grupo->id}/cierre")->assertRedirect(route('grupos.show', $this->grupo));

    expect($this->a->fresh()->only('estado', 'promedio_final'))->toBe(['estado' => 'egresado', 'promedio_final' => 8.5])
        ->and($this->b->fresh()->only('estado', 'promedio_final'))->toBe(['estado' => 'egresado', 'promedio_final' => 6.5])
        ->and($this->c->fresh()->only('estado', 'promedio_final'))->toBe(['estado' => 'no_acreditado', 'promedio_final' => 5.0])
        ->and($this->c->fresh()->fecha_cierre->toDateString())->toBe('2026-10-01')
        ->and($this->baja->fresh()->only('estado', 'promedio_final'))->toBe(['estado' => 'baja', 'promedio_final' => null]);

    $grupo = $this->grupo->fresh();
    expect($grupo->estado)->toBe('concluido')->and($grupo->concluido_por)->toBe($admin->id);

    $this->get("/grupos/{$this->grupo->id}")
        ->assertInertia(fn ($page) => $page
            ->where('cierre.egresados', 2)
            ->where('cierre.no_acreditados', 1)
            ->where('cierre.promedio', 6.7)
            ->where('canClose', false)
            ->where('canReopen', true)
            ->where('canTakeAttendance', false)
            ->where('canSuspend', false));

    // Grades are frozen: not even the admin can change them until the grupo is reopened.
    $this->put("/grupos/{$this->grupo->id}/calificaciones/{$this->m1->id}", [
        'fecha_evaluacion' => '2026-08-29',
        'registros' => [['inscripcion_id' => $this->c->id, 'calificacion' => '9']],
    ])->assertForbidden();
});

test('the admin and the director of the plantel conclude; the teacher and other directors can\'t', function () {
    ($this->calificar)($this->a, 8, 9);
    ($this->calificar)($this->b, 7, 7);
    ($this->calificar)($this->c, 9, 9);

    $this->actingAs($this->profesorUser)->get("/grupos/{$this->grupo->id}/cierre")->assertForbidden();
    $this->actingAs($this->profesorUser)->post("/grupos/{$this->grupo->id}/cierre")->assertForbidden();
    $this->actingAs(directorDe(Plantel::factory()->create()))->post("/grupos/{$this->grupo->id}/cierre")->assertForbidden();

    $director = directorDe($this->grupo->plantel);
    $this->actingAs($director)->post("/grupos/{$this->grupo->id}/cierre")->assertRedirect();

    expect($this->grupo->fresh()->estado)->toBe('concluido');

    // Only the admin reopens.
    $this->actingAs($director)->delete("/grupos/{$this->grupo->id}/cierre")->assertForbidden();
});

test('reopening puts the grupo and its alumnos back as they were', function () {
    ($this->calificar)($this->a, 8, 9);
    ($this->calificar)($this->b, 7, 7);
    ($this->calificar)($this->c, 5, 5);
    $this->actingAs(actingAsAdmin())->post("/grupos/{$this->grupo->id}/cierre");

    $this->delete("/grupos/{$this->grupo->id}/cierre")->assertRedirect(route('grupos.show', $this->grupo));

    expect($this->grupo->fresh()->only('estado', 'concluido_en', 'concluido_por'))->toBe(['estado' => 'en_curso', 'concluido_en' => null, 'concluido_por' => null])
        ->and(Inscripcion::where('grupo_id', $this->grupo->id)->pluck('estado')->sort()->values()->all())->toBe(['activo', 'activo', 'activo', 'baja'])
        ->and($this->c->fresh()->promedio_final)->toBeNull();
});

test('the grupo form can\'t conclude or reopen a grupo', function () {
    $datos = fn (string $estado) => [
        ...$this->grupo->only(['plantel_id', 'curso_id', 'profesor_id', 'clave', 'turno', 'hora_inicio', 'hora_fin', 'cupo']),
        'dias' => ['Dom'],
        'fecha_inicio' => '2026-08-02',
        'fecha_fin' => '2026-09-27',
        'estado' => $estado,
    ];
    $this->grupo->plantel->cursos()->attach($this->curso->id);
    $this->actingAs(actingAsAdmin());

    $this->put("/grupos/{$this->grupo->id}", $datos('concluido'))
        ->assertSessionHasErrors(['estado' => 'Para concluir el grupo usa «Concluir grupo»; para reabrirlo, «Reabrir grupo».']);

    $this->grupo->update(['estado' => 'concluido']);
    $this->put("/grupos/{$this->grupo->id}", $datos('en_curso'))->assertSessionHasErrors('estado');
    $this->put("/grupos/{$this->grupo->id}", $datos('concluido'))->assertSessionHasNoErrors();
});

test('the alumno sees how their past course ended', function () {
    ($this->calificar)($this->a, 8, 9);
    ($this->calificar)($this->b, 7, 7);
    ($this->calificar)($this->c, 5, 5);
    $this->actingAs(actingAsAdmin())->post("/grupos/{$this->grupo->id}/cierre");

    $alumnoUser = User::factory()->create();
    $alumnoUser->assignRole('Alumno');
    $this->c->alumno->update(['user_id' => $alumnoUser->id]);

    $this->actingAs($alumnoUser)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('anteriores.0.resultado', 'no_acreditado')
            ->where('anteriores.0.promedio', 5)
            ->where('anteriores.0.promedio_completo', true));
});
