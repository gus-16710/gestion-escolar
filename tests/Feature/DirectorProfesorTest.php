<?php

use App\Models\Alumno;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use Database\Seeders\RolePermissionSeeder;

/**
 * A director account that also has a profesor record (the school normally uses two separate
 * accounts, but the rules must hold if one is ever linked): Director of San Miguel, teaching a
 * grupo at Tlacolulan. San Miguel has another grupo taught by someone else.
 */
beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->sm = Plantel::factory()->create(['clave' => 'SM']);
    $this->tl = Plantel::factory()->create(['clave' => 'TL']);
    $curso = Curso::factory()->create();

    $this->director = directorDe($this->sm);
    $this->director->assignRole('Profesor');
    $this->suProfesor = Profesor::factory()->create(['user_id' => $this->director->id, 'email' => $this->director->email]);

    $grupo = fn (Plantel $plantel, Profesor $profesor) => Grupo::factory()->create([
        'plantel_id' => $plantel->id,
        'curso_id' => $curso->id,
        'profesor_id' => $profesor->id,
        'estado' => 'en_curso',
        'fecha_inicio' => now()->subDays(20)->toDateString(),
    ]);
    $this->suGrupoTl = $grupo($this->tl, $this->suProfesor);
    $this->grupoAjenoSm = $grupo($this->sm, Profesor::factory()->create());

    $this->alumnoTl = Alumno::factory()->create();
    $this->inscripcionTl = Inscripcion::factory()->create(['alumno_id' => $this->alumnoTl->id, 'grupo_id' => $this->suGrupoTl->id]);
    $this->inscripcionSm = Inscripcion::factory()->create(['grupo_id' => $this->grupoAjenoSm->id]);
});

function listaDe(Inscripcion $inscripcion): array
{
    return [
        'fecha' => now()->subDay()->toDateString(),
        'registros' => [['inscripcion_id' => $inscripcion->id, 'estado' => 'presente', 'observaciones' => null]],
    ];
}

test('a director who teaches sees their own grupo at a plantel they do not run, without managing it', function () {
    $this->actingAs($this->director)
        ->get('/grupos')
        ->assertInertia(fn ($page) => $page->where('grupos.data', fn ($grupos) => collect($grupos)->pluck('id')->sort()->values()->all()
            === collect([$this->suGrupoTl->id, $this->grupoAjenoSm->id])->sort()->values()->all()));

    $this->actingAs($this->director)
        ->get("/grupos/{$this->suGrupoTl->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canManage', false)->where('canEnroll', false)->where('canTakeAttendance', true));

    $this->actingAs($this->director)->get("/grupos/{$this->suGrupoTl->id}/edit")->assertForbidden();
    $this->actingAs($this->director)->delete("/grupos/{$this->suGrupoTl->id}")->assertForbidden();
});

test('a director who teaches takes attendance only in their own grupos', function () {
    $this->actingAs($this->director)
        ->put("/grupos/{$this->suGrupoTl->id}/asistencias", listaDe($this->inscripcionTl))
        ->assertSessionDoesntHaveErrors();

    expect($this->inscripcionTl->asistencias()->count())->toBe(1);

    // In the rest of the plantel they run, they can review attendance but not take it.
    $this->actingAs($this->director)
        ->get("/grupos/{$this->grupoAjenoSm->id}/asistencias")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('canTake', false));

    $this->actingAs($this->director)
        ->put("/grupos/{$this->grupoAjenoSm->id}/asistencias", listaDe($this->inscripcionSm))
        ->assertForbidden();
});

test('admins can still take attendance in any grupo', function () {
    $this->actingAs(actingAsAdmin())
        ->put("/grupos/{$this->grupoAjenoSm->id}/asistencias", listaDe($this->inscripcionSm))
        ->assertSessionDoesntHaveErrors();
});

test('a director who teaches sees their own students and their own profesor record', function () {
    $this->actingAs($this->director)
        ->get('/alumnos')
        ->assertInertia(fn ($page) => $page->where('alumnos.data', fn ($alumnos) => collect($alumnos)->pluck('id')->contains($this->alumnoTl->id)));

    $this->actingAs($this->director)
        ->get('/profesores')
        ->assertInertia(fn ($page) => $page->where('profesores.data', fn ($profesores) => collect($profesores)->pluck('id')->contains($this->suProfesor->id)));
});

test('removing the profesor record keeps the director role', function () {
    $this->suGrupoTl->update(['estado' => 'concluido']);

    $this->actingAs(actingAsAdmin())->delete("/profesores/{$this->suProfesor->id}")->assertRedirect();

    $this->director->refresh();
    expect($this->director->hasRole('Director'))->toBeTrue();
    expect($this->director->hasRole('Profesor'))->toBeFalse();
});
