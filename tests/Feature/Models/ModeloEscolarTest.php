<?php

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Illuminate\Database\QueryException;

test('a grupo belongs to a plantel, a curso and a profesor', function () {
    $grupo = Grupo::factory()->create();

    expect($grupo->plantel)->toBeInstanceOf(Plantel::class);
    expect($grupo->curso)->toBeInstanceOf(Curso::class);
    expect($grupo->profesor)->toBeInstanceOf(Profesor::class);
    expect($grupo->plantel->grupos->pluck('id'))->toContain($grupo->id);
    expect($grupo->profesor->grupos->pluck('id'))->toContain($grupo->id);
});

test('a curso can be offered at several planteles', function () {
    $curso = Curso::factory()->create();
    [$sanMiguel, $tlacolulan] = Plantel::factory(2)->create();

    $curso->planteles()->attach([$sanMiguel->id, $tlacolulan->id]);

    expect($curso->planteles)->toHaveCount(2);
    expect($tlacolulan->cursos->pluck('id'))->toContain($curso->id);
});

test('an alumno can be enrolled in grupos from different planteles', function () {
    $alumno = Alumno::factory()->create();
    $grupoSanMiguel = Grupo::factory()->create();
    $grupoTlacolulan = Grupo::factory()->create();

    Inscripcion::factory()->create(['alumno_id' => $alumno->id, 'grupo_id' => $grupoSanMiguel->id]);
    Inscripcion::factory()->create(['alumno_id' => $alumno->id, 'grupo_id' => $grupoTlacolulan->id]);

    expect($alumno->grupos)->toHaveCount(2);
    expect($alumno->grupos->pluck('plantel_id')->unique())->toHaveCount(2);
    expect($grupoSanMiguel->alumnos->pluck('id'))->toContain($alumno->id);
});

test('an inscripcion records which staff member enrolled the alumno', function () {
    $director = User::factory()->create();
    $inscripcion = Inscripcion::factory()->create(['inscrito_por' => $director->id]);

    expect($inscripcion->inscritoPor->is($director))->toBeTrue();
});

test('an alumno cannot be enrolled twice in the same grupo', function () {
    $inscripcion = Inscripcion::factory()->create();

    Inscripcion::factory()->create([
        'alumno_id' => $inscripcion->alumno_id,
        'grupo_id' => $inscripcion->grupo_id,
    ]);
})->throws(QueryException::class);

test('attendance is recorded once per inscripcion and date', function () {
    $inscripcion = Inscripcion::factory()->create();

    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => '2026-09-26', 'estado' => 'presente']);

    expect($inscripcion->grupo->asistencias)->toHaveCount(1);

    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => '2026-09-26', 'estado' => 'falta']);
})->throws(QueryException::class);

test('a curso with grupos cannot be permanently deleted', function () {
    $grupo = Grupo::factory()->create();

    $grupo->curso->forceDelete();
})->throws(QueryException::class);

test('users link to their profesor and alumno records and to staff planteles', function () {
    $user = User::factory()->create();
    $plantel = Plantel::factory()->create();

    $profesor = Profesor::factory()->create(['user_id' => $user->id]);
    $user->planteles()->attach($plantel);

    expect($user->profesor->is($profesor))->toBeTrue();
    expect($user->alumno)->toBeNull();
    expect($plantel->usuarios->pluck('id'))->toContain($user->id);
});
