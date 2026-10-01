<?php

use App\Models\Alumno;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

/**
 * Two planteles, each with a grupo, its profesor and an alumno; plus an alumno enrolled at both,
 * and an alumno and a profesor who have no grupo yet.
 */
beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->sm = Plantel::factory()->create(['nombre' => 'CICCIS San Miguel', 'clave' => 'SM']);
    $this->tl = Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan', 'clave' => 'TL']);
    $this->curso = Curso::factory()->create(['clave' => 'BAR']);
    $this->curso->planteles()->attach([$this->sm->id, $this->tl->id]);

    $this->profesorSm = Profesor::factory()->create();
    $this->profesorTl = Profesor::factory()->create();
    $this->profesorLibre = Profesor::factory()->create();

    $grupo = fn (Plantel $plantel, Profesor $profesor) => Grupo::factory()->create([
        'plantel_id' => $plantel->id,
        'curso_id' => $this->curso->id,
        'profesor_id' => $profesor->id,
        'estado' => 'en_curso',
        'cupo' => null,
    ]);
    $this->grupoSm = $grupo($this->sm, $this->profesorSm);
    $this->grupoTl = $grupo($this->tl, $this->profesorTl);

    $this->alumnoSm = Alumno::factory()->create();
    $this->alumnoTl = Alumno::factory()->create();
    $this->alumnoAmbos = Alumno::factory()->create();
    $this->alumnoLibre = Alumno::factory()->create();

    foreach ([[$this->alumnoSm, $this->grupoSm], [$this->alumnoTl, $this->grupoTl], [$this->alumnoAmbos, $this->grupoSm], [$this->alumnoAmbos, $this->grupoTl]] as [$alumno, $g]) {
        Inscripcion::factory()->create(['alumno_id' => $alumno->id, 'grupo_id' => $g->id]);
    }

    $this->director = directorDe($this->sm);
});

function idsDe($page, string $prop): array
{
    return collect($page->toArray()['props'][$prop]['data'])->pluck('id')->sort()->values()->all();
}

function ids(...$modelos): array
{
    return collect($modelos)->pluck('id')->sort()->values()->all();
}

test('a director only lists and filters by the grupos of their planteles', function () {
    $this->actingAs($this->director)
        ->get('/grupos')
        ->assertInertia(fn ($page) => $page
            ->where('grupos.data', fn ($grupos) => collect($grupos)->pluck('id')->all() === [$this->grupoSm->id])
            ->where('planteles', fn ($planteles) => collect($planteles)->pluck('id')->all() === [$this->sm->id]));
});

test('a director cannot open or change a grupo of another plantel', function () {
    $ajeno = $this->grupoTl;

    $this->actingAs($this->director)->get("/grupos/{$ajeno->id}")->assertForbidden();
    $this->actingAs($this->director)->get("/grupos/{$ajeno->id}/edit")->assertForbidden();
    $this->actingAs($this->director)->put("/grupos/{$ajeno->id}", ['estado' => 'cancelado'])->assertForbidden();
    $this->actingAs($this->director)->delete("/grupos/{$ajeno->id}")->assertForbidden();
    $this->actingAs($this->director)->post("/grupos/{$ajeno->id}/inscripciones", ['alumno_id' => $this->alumnoLibre->id])->assertForbidden();
    $this->actingAs($this->director)->get("/grupos/{$ajeno->id}/asistencias")->assertForbidden();

    $this->actingAs($this->director)->get("/grupos/{$this->grupoSm->id}")->assertOk();
    $this->actingAs($this->director)->get("/grupos/{$this->grupoSm->id}/asistencias")->assertOk();
});

test('a director can only open grupos in their planteles and cannot move one elsewhere', function () {
    $datos = fn (Plantel $plantel) => [
        'plantel_id' => $plantel->id,
        'curso_id' => $this->curso->id,
        'turno' => 'sabatino',
        'fecha_inicio' => now()->toDateString(),
        'estado' => 'planeado',
    ];

    $this->actingAs($this->director)
        ->get('/grupos/create')
        ->assertInertia(fn ($page) => $page->where('planteles', fn ($planteles) => collect($planteles)->pluck('id')->all() === [$this->sm->id]));

    $this->actingAs($this->director)->post('/grupos', $datos($this->tl))->assertSessionHasErrors('plantel_id');
    $this->actingAs($this->director)->post('/grupos', $datos($this->sm))->assertSessionDoesntHaveErrors();

    $this->actingAs($this->director)->put("/grupos/{$this->grupoSm->id}", $datos($this->tl))->assertSessionHasErrors('plantel_id');
    expect($this->grupoSm->fresh()->plantel_id)->toBe($this->sm->id);
});

test('a director sees the alumnos of their planteles plus those without a grupo', function () {
    $this->actingAs($this->director)
        ->get('/alumnos')
        ->assertInertia(fn ($page) => expect(idsDe($page, 'alumnos'))->toBe(ids($this->alumnoSm, $this->alumnoAmbos, $this->alumnoLibre)));

    // An alumno enrolled at both planteles only shows the grupos within reach.
    $this->actingAs($this->director)
        ->get('/alumnos?search='.urlencode($this->alumnoAmbos->matricula))
        ->assertInertia(fn ($page) => $page->where('alumnos.data.0.cursos', fn ($cursos) => collect($cursos)->pluck('grupo_clave')->all() === [$this->grupoSm->clave]));

    $this->actingAs($this->director)->get("/alumnos/{$this->alumnoTl->id}/edit")->assertForbidden();
    $this->actingAs($this->director)->put("/alumnos/{$this->alumnoTl->id}", ['nombre' => 'X'])->assertForbidden();
    $this->actingAs($this->director)->delete("/alumnos/{$this->alumnoTl->id}")->assertForbidden();

    $this->actingAs($this->director)->get("/alumnos/{$this->alumnoAmbos->id}/edit")->assertOk();
    $this->actingAs($this->director)->get("/alumnos/{$this->alumnoLibre->id}/edit")->assertOk();
});

test('the enrollment picker offers every active alumno, even from the other plantel', function () {
    $this->actingAs($this->director)
        ->get("/grupos/{$this->grupoSm->id}")
        ->assertInertia(fn ($page) => $page->where('alumnosDisponibles', fn ($alumnos) => collect($alumnos)->pluck('id')->sort()->values()->all() === ids($this->alumnoTl, $this->alumnoLibre)));

    $this->actingAs($this->director)
        ->post("/grupos/{$this->grupoSm->id}/inscripciones", ['alumno_id' => $this->alumnoTl->id])
        ->assertSessionDoesntHaveErrors();

    expect($this->alumnoTl->grupos()->pluck('grupos.id')->sort()->values()->all())->toBe(ids($this->grupoSm, $this->grupoTl));
});

test('a director sees the profesores of their planteles plus those without a grupo', function () {
    $this->actingAs($this->director)
        ->get('/profesores')
        ->assertInertia(fn ($page) => expect(idsDe($page, 'profesores'))->toBe(ids($this->profesorSm, $this->profesorLibre)));

    $this->actingAs($this->director)->get("/profesores/{$this->profesorTl->id}/edit")->assertForbidden();
    $this->actingAs($this->director)->delete("/profesores/{$this->profesorTl->id}")->assertForbidden();
    $this->actingAs($this->director)->get("/profesores/{$this->profesorSm->id}/edit")->assertOk();

    // Any active profesor can still be assigned to a grupo: teachers can work at both planteles.
    $this->actingAs($this->director)
        ->get('/grupos/create')
        ->assertInertia(fn ($page) => $page->has('profesores', 3));
});

test('a director only sees their planteles', function () {
    $this->actingAs($this->director)
        ->get('/planteles')
        ->assertInertia(fn ($page) => expect(idsDe($page, 'planteles'))->toBe([$this->sm->id]));
});

test('a director without an assigned plantel only sees records that have no plantel yet', function () {
    $sinPlantel = directorDe();

    $this->actingAs($sinPlantel)->get('/grupos')->assertInertia(fn ($page) => $page->has('grupos.data', 0));
    $this->actingAs($sinPlantel)->get('/alumnos')->assertInertia(fn ($page) => expect(idsDe($page, 'alumnos'))->toBe([$this->alumnoLibre->id]));
    $this->actingAs($sinPlantel)->get('/profesores')->assertInertia(fn ($page) => expect(idsDe($page, 'profesores'))->toBe([$this->profesorLibre->id]));

    // Registering an alumno needs no plantel, so an unassigned director can still do it.
    $this->actingAs($sinPlantel)->post('/alumnos', ['nombre' => 'Ana', 'apellido_paterno' => 'Ruiz', 'activo' => true])->assertSessionDoesntHaveErrors();
    expect(Alumno::where('nombre', 'Ana')->value('matricula'))->toBe(now()->year.'-0001');
});

test('admins still see every plantel', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)->get('/grupos')->assertInertia(fn ($page) => $page->has('grupos.data', 2));
    $this->actingAs($admin)->get('/alumnos')->assertInertia(fn ($page) => $page->has('alumnos.data', 4));
    $this->actingAs($admin)->get('/profesores')->assertInertia(fn ($page) => $page->has('profesores.data', 3));
    $this->actingAs($admin)->get("/grupos/{$this->grupoTl->id}/edit")->assertOk();
});

test('profesores only see the alumnos of the grupos they teach', function () {
    $cuenta = User::factory()->create();
    $cuenta->assignRole('Profesor');
    $this->profesorSm->update(['user_id' => $cuenta->id]);

    $this->actingAs($cuenta)
        ->get('/alumnos')
        ->assertOk()
        ->assertInertia(fn ($page) => expect(idsDe($page, 'alumnos'))->toBe(ids($this->alumnoSm, $this->alumnoAmbos)));
});
