<?php

use App\Models\Asistencia;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->profesorUser = User::factory()->create();
    $this->profesorUser->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $this->profesorUser->id]);

    $this->grupo = Grupo::factory()->create([
        'profesor_id' => $profesor->id,
        'estado' => 'en_curso',
        'fecha_inicio' => now()->subMonth()->toDateString(),
        'fecha_fin' => now()->addMonths(3)->toDateString(),
    ]);

    [$this->a, $this->b] = Inscripcion::factory(2)->create(['grupo_id' => $this->grupo->id]);
});

function paseLista(array $estados, ?string $fecha = null): array
{
    return [
        'fecha' => $fecha ?? now()->subDay()->toDateString(),
        'registros' => collect($estados)->map(fn ($estado, $inscripcionId) => [
            'inscripcion_id' => $inscripcionId,
            'estado' => $estado,
            'observaciones' => $estado === 'justificada' ? 'Cita médica' : null,
        ])->values()->all(),
    ];
}

test('the teacher of the grupo can take and correct attendance', function () {
    $fecha = now()->subDay()->toDateString();

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias?fecha={$fecha}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('asistencias/pase-lista')->where('canTake', true)->has('alumnos', 2));

    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente', $this->b->id => 'falta'], $fecha))
        ->assertRedirect(route('asistencias.edit', ['grupo' => $this->grupo, 'fecha' => $fecha]));

    expect(Asistencia::count())->toBe(2);
    expect($this->b->asistencias()->first()->estado)->toBe('falta');
    expect($this->b->asistencias()->first()->registrado_por)->toBe($this->profesorUser->id);

    // Saving the same date again corrects the records instead of duplicating them.
    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente', $this->b->id => 'justificada'], $fecha))
        ->assertSessionHasNoErrors();

    expect(Asistencia::count())->toBe(2);
    expect($this->b->asistencias()->first()->estado)->toBe('justificada');
    expect($this->b->asistencias()->first()->observaciones)->toBe('Cita médica');
});

test('the roll call shows history and per-alumno attendance percentage', function () {
    foreach ([3, 2, 1] as $dias) {
        Asistencia::create(['inscripcion_id' => $this->a->id, 'fecha' => now()->subDays($dias)->toDateString(), 'estado' => $dias === 2 ? 'falta' : 'presente']);
        Asistencia::create(['inscripcion_id' => $this->b->id, 'fecha' => now()->subDays($dias)->toDateString(), 'estado' => 'presente']);
    }

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias?fecha=".now()->subDays(2)->toDateString())
        ->assertInertia(fn ($page) => $page
            ->has('historial', 3)
            ->where('historial.0.fecha', now()->subDay()->toDateString())
            ->where('historial.1.faltas', 1)
            ->where('alumnos', fn ($alumnos) => collect($alumnos)->firstWhere('inscripcion_id', $this->a->id)['resumen']['porcentaje'] === 67
                && collect($alumnos)->firstWhere('inscripcion_id', $this->a->id)['estado'] === 'falta'));
});

test('other teachers cannot see or take attendance of the grupo', function () {
    $otro = User::factory()->create();
    $otro->assignRole('Profesor');
    Profesor::factory()->create(['user_id' => $otro->id]);

    $this->actingAs($otro)->get("/grupos/{$this->grupo->id}/asistencias")->assertForbidden();
    $this->actingAs($otro)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente', $this->b->id => 'presente']))
        ->assertForbidden();
});

test('directors can review attendance but not take it', function () {
    $director = directorDe($this->grupo->plantel);

    $this->actingAs($director)
        ->get("/grupos/{$this->grupo->id}/asistencias")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canTake', false));

    $this->actingAs($director)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente', $this->b->id => 'presente']))
        ->assertForbidden();
});

test('attendance cannot be taken for future dates, dates before the grupo starts or other grupos', function () {
    $ajena = Inscripcion::factory()->create();

    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente'], now()->addDay()->toDateString()))
        ->assertSessionHasErrors('fecha');

    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente'], now()->subMonths(2)->toDateString()))
        ->assertSessionHasErrors('fecha');

    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$ajena->id => 'presente']))
        ->assertSessionHasErrors('registros.0.inscripcion_id');

    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'dormido']))
        ->assertSessionHasErrors('registros.0.estado');

    expect(Asistencia::count())->toBe(0);
});

test('attendance cannot be taken on cancelled grupos', function () {
    $this->grupo->update(['estado' => 'cancelado']);

    $this->actingAs($this->profesorUser)
        ->put("/grupos/{$this->grupo->id}/asistencias", paseLista([$this->a->id => 'presente']))
        ->assertForbidden();
});

test('dropped alumnos leave the roll call but keep their past records', function () {
    $ayer = now()->subDay()->toDateString();
    Asistencia::create(['inscripcion_id' => $this->b->id, 'fecha' => $ayer, 'estado' => 'presente']);
    $this->b->update(['estado' => 'baja']);

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias?fecha=".now()->toDateString())
        ->assertInertia(fn ($page) => $page->has('alumnos', 1));

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias?fecha={$ayer}")
        ->assertInertia(fn ($page) => $page->has('alumnos', 2));
});

test('without a date the roll call opens on the latest class day', function () {
    // Wednesday 30 Sep 2026; the grupo meets on Fridays and Sundays.
    $this->travelTo('2026-09-30 10:00');
    $this->grupo->update(['dias' => 'Vie,Dom', 'fecha_inicio' => '2026-08-01', 'fecha_fin' => null]);

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias")
        ->assertInertia(fn ($page) => $page
            ->where('fecha', '2026-09-27')
            ->where('grupo.dias', ['Vie', 'Dom']));

    // An explicit date is kept even if it is not a class day.
    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias?fecha=2026-09-30")
        ->assertInertia(fn ($page) => $page->where('fecha', '2026-09-30'));
});
