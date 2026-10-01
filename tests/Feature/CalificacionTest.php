<?php

use App\Models\Calificacion;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use App\Support\Calificaciones\Boleta;
use App\Support\Dashboard\ResumenEscolar;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->travelTo('2026-10-01 10:00');

    $this->profesorUser = User::factory()->create();
    $this->profesorUser->assignRole('Profesor');
    $this->profesor = Profesor::factory()->create(['user_id' => $this->profesorUser->id]);

    // A Sunday grupo from 2026-08-02: module 1 (4 weeks) ended 08-29, module 2 (10 weeks) runs until 11-07, module 3 is ahead.
    $this->curso = Curso::factory()->create(['duracion_semanas' => 16]);
    [$this->m1, $this->m2, $this->m3] = collect([['Fundamentos', 4], ['Técnicas', 10], ['Proyecto', 2]])
        ->map(fn ($datos, $i) => $this->curso->modulos()->create(['orden' => $i + 1, 'nombre' => $datos[0], 'duracion_semanas' => $datos[1]]))
        ->all();

    $this->grupo = Grupo::factory()->create([
        'curso_id' => $this->curso->id,
        'profesor_id' => $this->profesor->id,
        'dias' => 'Dom',
        'estado' => 'en_curso',
        'fecha_inicio' => '2026-08-02',
        'fecha_fin' => '2026-11-22',
    ]);

    [$this->a, $this->b] = Inscripcion::factory(2)->create(['grupo_id' => $this->grupo->id]);
});

function captura(array $registros, string $fecha = '2026-08-29'): array
{
    return [
        'fecha_evaluacion' => $fecha,
        'registros' => collect($registros)->map(fn (array $registro, int $inscripcionId) => ['inscripcion_id' => $inscripcionId, ...$registro])->values()->all(),
    ];
}

test('the teacher records and corrects a module\'s grades, with a retake for a failed one', function () {
    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/calificaciones/{$this->m1->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('calificaciones/capturar')
            ->where('canGrade', true)
            ->where('modulo.estado', 'terminado')
            ->where('fecha', '2026-08-29')
            ->has('alumnos', 2));

    $this->put("/grupos/{$this->grupo->id}/calificaciones/{$this->m1->id}", captura([
        $this->a->id => ['calificacion' => '8.5'],
        $this->b->id => ['calificacion' => '4', 'recuperacion' => '9', 'fecha_recuperacion' => '2026-09-05', 'observaciones' => 'Presentó extraordinario'],
    ]))->assertRedirect(route('calificaciones.edit', [$this->grupo, $this->m1]));

    $b = Calificacion::where('inscripcion_id', $this->b->id)->sole();
    expect(Calificacion::count())->toBe(2)
        ->and($b->calificacion)->toBe(4.0)
        ->and($b->final())->toBe(9.0)
        ->and($b->aprobada())->toBeTrue()
        ->and($b->registrado_por)->toBe($this->profesorUser->id);

    // Saving again corrects without duplicating, and an emptied grade is removed.
    $this->put("/grupos/{$this->grupo->id}/calificaciones/{$this->m1->id}", captura([
        $this->a->id => ['calificacion' => '9'],
        $this->b->id => ['calificacion' => null],
    ]))->assertSessionHasNoErrors();

    expect(Calificacion::count())->toBe(1)
        ->and(Calificacion::sole()->calificacion)->toBe(9.0);
});

test('grades are validated', function () {
    $url = "/grupos/{$this->grupo->id}/calificaciones/{$this->m1->id}";
    $this->actingAs($this->profesorUser);

    $this->put($url, captura([$this->a->id => ['calificacion' => '10.5']]))->assertSessionHasErrors(['registros.0.calificacion' => 'La calificación va de 0 a 10.']);
    $this->put($url, captura([$this->a->id => ['calificacion' => '8.25']]))->assertSessionHasErrors(['registros.0.calificacion' => 'Usa a lo más un decimal (por ejemplo 8.5).']);
    $this->put($url, captura([$this->a->id => ['calificacion' => '7', 'recuperacion' => '9', 'fecha_recuperacion' => '2026-09-05']]))
        ->assertSessionHasErrors(['registros.0.recuperacion' => 'Solo hay recuperación cuando el módulo se reprobó.']);
    $this->put($url, captura([$this->a->id => ['calificacion' => '5', 'recuperacion' => '9']]))
        ->assertSessionHasErrors(['registros.0.fecha_recuperacion' => 'Indica la fecha de la recuperación.']);
    $this->put($url, captura([$this->a->id => ['calificacion' => '5', 'recuperacion' => '9', 'fecha_recuperacion' => '2026-08-20']]))
        ->assertSessionHasErrors(['registros.0.fecha_recuperacion' => 'La recuperación no puede ser antes del examen.']);
    $this->put($url, captura([$this->a->id => ['calificacion' => '8']], '2026-10-10'))->assertSessionHasErrors('fecha_evaluacion');

    $otra = Inscripcion::factory()->create();
    $this->put($url, captura([$otra->id => ['calificacion' => '8']]))->assertSessionHasErrors('registros.0.inscripcion_id');

    expect(Calificacion::count())->toBe(0);
});

test('a module that hasn\'t started can\'t be graded, and a module of another curso is not found', function () {
    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/calificaciones/{$this->m3->id}")
        ->assertInertia(fn ($page) => $page->where('modulo.estado', 'proximo')->where('canGrade', false));

    $this->put("/grupos/{$this->grupo->id}/calificaciones/{$this->m3->id}", captura([$this->a->id => ['calificacion' => '8']]))
        ->assertSessionHasErrors(['fecha_evaluacion' => 'Este módulo todavía no empieza; aún no se puede calificar.']);

    $ajeno = Curso::factory()->create()->modulos()->create(['orden' => 1, 'nombre' => 'Otro', 'duracion_semanas' => 2]);
    $this->get("/grupos/{$this->grupo->id}/calificaciones/{$ajeno->id}")->assertNotFound();
});

test('only the grupo\'s teacher and the admin record grades; the director of the plantel only reviews them', function () {
    $datos = captura([$this->a->id => ['calificacion' => '8']]);
    $url = "/grupos/{$this->grupo->id}/calificaciones/{$this->m1->id}";

    $otroProfesor = User::factory()->create();
    $otroProfesor->assignRole('Profesor');
    Profesor::factory()->create(['user_id' => $otroProfesor->id]);

    $this->actingAs($otroProfesor)->get("/grupos/{$this->grupo->id}/calificaciones")->assertForbidden();
    $this->actingAs($otroProfesor)->put($url, $datos)->assertForbidden();

    $director = directorDe($this->grupo->plantel);
    $this->actingAs($director)->get("/grupos/{$this->grupo->id}/calificaciones")->assertOk()->assertInertia(fn ($page) => $page->where('canGrade', false));
    $this->actingAs($director)->put($url, $datos)->assertForbidden();
    $this->actingAs(directorDe(Plantel::factory()->create()))->get("/grupos/{$this->grupo->id}/calificaciones")->assertForbidden();

    $this->actingAs(actingAsAdmin())->put($url, $datos)->assertSessionHasNoErrors();
    expect(Calificacion::count())->toBe(1);
});

test('the report card averages the modules, with the final average only once all are graded', function () {
    $modulos = $this->curso->modulos;
    $nota = fn (int $modulo, float $calificacion, ?float $recuperacion = null) => new Calificacion([
        'curso_modulo_id' => $modulos[$modulo]->id, 'calificacion' => $calificacion, 'recuperacion' => $recuperacion,
    ]);

    expect(Boleta::de($modulos, collect()))->toMatchArray(['promedio_parcial' => null, 'situacion' => 'sin_calificaciones']);

    $parcial = Boleta::de($modulos, collect([$nota(0, 8), $nota(1, 4, 9)]));
    expect($parcial)->toMatchArray(['promedio_parcial' => 8.5, 'promedio_final' => null, 'calificados' => 2, 'total' => 3, 'reprobados' => 0, 'situacion' => 'en_curso'])
        ->and($parcial['modulos'][1])->toMatchArray(['calificacion' => 4.0, 'recuperacion' => 9.0, 'final' => 9.0, 'aprobada' => true]);

    expect(Boleta::de($modulos, collect([$nota(0, 8), $nota(1, 9), $nota(2, 7)])))->toMatchArray(['promedio_final' => 8.0, 'situacion' => 'aprobado'])
        ->and(Boleta::de($modulos, collect([$nota(0, 5), $nota(1, 6), $nota(2, 5.5)])))->toMatchArray(['promedio_final' => 5.5, 'reprobados' => 2, 'situacion' => 'reprobado']);
});

test('the grade sheet shows each alumno\'s grades and the grupo\'s averages', function () {
    Calificacion::create(['inscripcion_id' => $this->a->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => 9, 'fecha_evaluacion' => '2026-08-29']);
    Calificacion::create(['inscripcion_id' => $this->b->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => 5, 'fecha_evaluacion' => '2026-08-29']);

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/calificaciones")
        ->assertInertia(fn ($page) => $page
            ->component('calificaciones/sabana')
            ->has('modulos', 3)
            ->where('modulos.0.capturadas', 2)
            ->where('modulos.0.promedio', 7)
            ->where('modulos.0.reprobados', 1)
            ->where('modulos.1.estado', 'actual')
            ->has('alumnos', 2)
            ->where('resumen.promedio', 7)
            ->where('resumen.bajo_minimo', 1)
            ->where('canGrade', true));

    // The grupo page shows the module's average in the study plan.
    $this->get("/grupos/{$this->grupo->id}")
        ->assertInertia(fn ($page) => $page->where('modulos.0.promedio', 7)->where('modulos.0.calificadas', 2)->where('canViewGrades', true));
});

test('the teacher\'s start page lists finished modules still to grade', function () {
    Calificacion::create(['inscripcion_id' => $this->a->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => 9, 'fecha_evaluacion' => '2026-08-29']);

    $pendientes = (new ResumenEscolar(profesorId: $this->profesor->id))->calificacionesPendientes();

    expect($pendientes)->toHaveCount(1)
        ->and($pendientes[0])->toMatchArray(['modulo_id' => $this->m1->id, 'alumnos' => 2, 'faltan' => 1]);

    Calificacion::create(['inscripcion_id' => $this->b->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => 7, 'fecha_evaluacion' => '2026-08-29']);

    $this->actingAs($this->profesorUser)->get('/dashboard')->assertInertia(fn ($page) => $page->where('calificacionesPendientes', []));
});

test('the alumno sees their grades on their start page and staff in their record', function () {
    $alumnoUser = User::factory()->create();
    $alumnoUser->assignRole('Alumno');
    $this->a->alumno->update(['user_id' => $alumnoUser->id]);
    Calificacion::create(['inscripcion_id' => $this->a->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => 4, 'recuperacion' => 8, 'fecha_evaluacion' => '2026-08-29', 'fecha_recuperacion' => '2026-09-05']);

    $this->actingAs($alumnoUser)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->where('cursos.0.calificaciones.promedio_parcial', 8)
            ->where('cursos.0.calificaciones.modulos.0.nombre', 'Fundamentos')
            ->where('cursos.0.calificaciones.modulos.0.recuperacion', 8)
            ->where('cursos.0.calificaciones.modulos.1.estado', 'actual'));

    $this->actingAs(actingAsAdmin())
        ->get("/alumnos/{$this->a->alumno_id}/edit")
        ->assertInertia(fn ($page) => $page->where('inscripciones.0.calificaciones.promedio_parcial', 8)->where('inscripciones.0.puede_ver_calificaciones', true));
});

test('a module with grades can\'t be removed from the study plan', function () {
    Calificacion::create(['inscripcion_id' => $this->a->id, 'curso_modulo_id' => $this->m1->id, 'calificacion' => 9, 'fecha_evaluacion' => '2026-08-29']);

    $this->actingAs(actingAsAdmin())
        ->put("/cursos/{$this->curso->id}", [
            ...$this->curso->only(['nombre', 'clave', 'descripcion', 'duracion_semanas', 'activo']),
            'planteles' => [(string) $this->grupo->plantel_id],
            'modulos' => [
                ['id' => $this->m2->id, 'nombre' => 'Técnicas', 'duracion_semanas' => 10],
                ['id' => $this->m3->id, 'nombre' => 'Proyecto', 'duracion_semanas' => 2],
            ],
        ])
        ->assertSessionHasErrors(['modulos' => 'El módulo «Fundamentos» ya tiene calificaciones; no se puede quitar del plan de estudios.']);

    expect($this->curso->modulos()->count())->toBe(3);
});
