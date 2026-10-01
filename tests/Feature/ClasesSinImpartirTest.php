<?php

use App\Models\Asistencia;
use App\Models\ClaseSuspendida;
use App\Models\Curso;
use App\Models\DiaSinClase;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use App\Support\CalendarioGrupo;
use App\Support\Dashboard\ResumenEscolar;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->travelTo('2026-10-01 10:00');

    $this->profesorUser = User::factory()->create();
    $this->profesorUser->assignRole('Profesor');
    $this->profesor = Profesor::factory()->create(['user_id' => $this->profesorUser->id]);

    // A Sunday grupo (2026-08-02 is a Sunday) of a 16-week curso in modules of 4, 10 and 2 weeks.
    $this->curso = Curso::factory()->create(['duracion_semanas' => 16]);
    $this->curso->modulos()->create(['orden' => 1, 'nombre' => 'Fundamentos', 'duracion_semanas' => 4]);
    $this->curso->modulos()->create(['orden' => 2, 'nombre' => 'Técnicas', 'duracion_semanas' => 10]);
    $this->curso->modulos()->create(['orden' => 3, 'nombre' => 'Proyecto', 'duracion_semanas' => 2]);

    $this->grupo = Grupo::factory()->create([
        'curso_id' => $this->curso->id,
        'profesor_id' => $this->profesor->id,
        'dias' => 'Dom',
        'estado' => 'en_curso',
        'fecha_inicio' => '2026-08-02',
        'fecha_fin' => '2026-11-22',
    ]);
});

function calendarioDe(Grupo $grupo): CalendarioGrupo
{
    return new CalendarioGrupo($grupo->fresh());
}

test('a lost class pushes the study plan and the end of the grupo by a week', function () {
    $this->actingAs($this->profesorUser)
        ->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-08-09', 'motivo' => 'salud'])
        ->assertSessionHasNoErrors();

    $this->actingAs(actingAsAdmin())
        ->get("/grupos/{$this->grupo->id}")
        ->assertInertia(fn ($page) => $page
            ->where('modulos.0.fin', '2026-09-05')
            ->where('modulos.1.inicio', '2026-09-06')
            ->where('modulos.1.estado', 'actual')
            ->where('modulos.2.inicio', '2026-11-15')
            ->where('grupo.fecha_fin', '2026-11-22')
            ->where('grupo.fecha_fin_estimada', '2026-11-29')
            ->where('grupo.semanas_recorridas', 1)
            ->has('clasesSinImpartir', 1)
            ->where('clasesSinImpartir.0.fecha', '2026-08-09')
            ->where('clasesSinImpartir.0.tipo', 'suspendida')
            ->where('clasesSinImpartir.0.motivo', 'Salud'));
});

test('a class made up on another date shifts nothing', function () {
    $this->actingAs($this->profesorUser)
        ->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-08-09', 'motivo' => 'profesor', 'fecha_reposicion' => '2026-08-12'])
        ->assertSessionHasNoErrors();

    $calendario = calendarioDe($this->grupo);

    expect($calendario->modulos($this->curso->modulos)[0]['fin'])->toBe('2026-08-29')
        ->and($calendario->semanasRecorridas())->toBe(0)
        ->and($calendario->hayClase(now()->setDate(2026, 8, 12)))->toBeTrue()
        ->and($calendario->clasesRepuestasEn(now()->setDate(2026, 8, 12)))->toBe(['2026-08-09']);
});

test('a school-wide holiday affects every plantel, a plantel holiday only its own', function () {
    $otro = Grupo::factory()->create([...$this->grupo->only('curso_id', 'dias', 'estado', 'fecha_inicio', 'fecha_fin'), 'plantel_id' => Plantel::factory()]);

    DiaSinClase::create(['fecha_inicio' => '2026-08-09', 'fecha_fin' => '2026-08-09', 'motivo' => 'Asueto']);
    DiaSinClase::create(['plantel_id' => $otro->plantel_id, 'fecha_inicio' => '2026-08-15', 'fecha_fin' => '2026-08-22', 'motivo' => 'Remodelación']);

    expect(calendarioDe($this->grupo)->semanasRecorridas())->toBe(1)
        ->and(calendarioDe($otro)->semanasRecorridas())->toBe(2)
        ->and(calendarioDe($otro)->sinClaseEn(now()->setDate(2026, 8, 16)))->toMatchArray(['tipo' => 'festivo', 'motivo' => 'Remodelación']);
});

test('in a grupo that meets several days a week a single lost class still delays the stretch it falls in', function () {
    $curso = Curso::factory()->create(['duracion_semanas' => 2]);
    $curso->modulos()->create(['orden' => 1, 'nombre' => 'Uno', 'duracion_semanas' => 1]);
    $curso->modulos()->create(['orden' => 2, 'nombre' => 'Dos', 'duracion_semanas' => 1]);
    $grupo = Grupo::factory()->create(['curso_id' => $curso->id, 'dias' => 'Lun,Mié,Vie', 'fecha_inicio' => '2026-08-03', 'fecha_fin' => null]);

    expect(collect(calendarioDe($grupo)->modulos($curso->modulos))->pluck('fin')->all())->toBe(['2026-08-09', '2026-08-16']);

    ClaseSuspendida::create(['grupo_id' => $grupo->id, 'fecha' => '2026-08-03', 'motivo' => 'evento']);

    expect(collect(calendarioDe($grupo)->modulos($curso->modulos))->pluck('fin')->all())->toBe(['2026-08-16', '2026-08-23'])
        ->and(calendarioDe($grupo)->finAjustado()->toDateString())->toBe('2026-08-24');
});

test('suspending a class is for its teacher, the director of its plantel and the admin', function () {
    $datos = ['fecha' => '2026-09-27', 'motivo' => 'otro'];

    $otroProfesor = User::factory()->create();
    $otroProfesor->assignRole('Profesor');
    Profesor::factory()->create(['user_id' => $otroProfesor->id]);

    $this->actingAs($otroProfesor)->post("/grupos/{$this->grupo->id}/clases-suspendidas", $datos)->assertForbidden();
    $this->actingAs(directorDe(Plantel::factory()->create()))->post("/grupos/{$this->grupo->id}/clases-suspendidas", $datos)->assertForbidden();
    $this->actingAs(directorDe($this->grupo->plantel))->post("/grupos/{$this->grupo->id}/clases-suspendidas", $datos)->assertSessionHasNoErrors();

    $clase = ClaseSuspendida::sole();
    $this->actingAs($otroProfesor)->delete("/clases-suspendidas/{$clase->id}")->assertForbidden();
    $this->actingAs(actingAsAdmin())->delete("/clases-suspendidas/{$clase->id}")->assertRedirect();

    expect(ClaseSuspendida::count())->toBe(0);
});

test('only a class day without a roll call can be suspended', function () {
    $inscripcion = Inscripcion::factory()->create(['grupo_id' => $this->grupo->id]);
    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => '2026-09-20', 'estado' => 'presente']);

    $this->actingAs($this->profesorUser)
        ->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-09-23', 'motivo' => 'otro'])
        ->assertSessionHasErrors(['fecha' => 'Ese día no hay clase de este grupo.']);

    $this->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-09-20', 'motivo' => 'otro'])
        ->assertSessionHasErrors(['fecha' => 'Ese día ya se pasó lista: la clase sí se dio.']);

    $this->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-09-27', 'motivo' => 'otro', 'fecha_reposicion' => '2026-09-27'])
        ->assertSessionHasErrors('fecha_reposicion');

    // Saving the same date again corrects it instead of duplicating it.
    $this->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-09-27', 'motivo' => 'otro'])->assertSessionHasNoErrors();
    $this->post("/grupos/{$this->grupo->id}/clases-suspendidas", ['fecha' => '2026-09-27', 'motivo' => 'salud', 'fecha_reposicion' => '2026-10-03'])->assertSessionHasNoErrors();

    expect(ClaseSuspendida::sole()->only('motivo'))->toBe(['motivo' => 'salud'])
        ->and(ClaseSuspendida::sole()->fecha_reposicion->toDateString())->toBe('2026-10-03');
});

test('a day without class is not an overdue roll call', function () {
    $inscripcion = Inscripcion::factory()->create(['grupo_id' => $this->grupo->id]);
    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => '2026-09-20', 'estado' => 'presente']);

    // Last roll call 11 days ago: overdue.
    expect((new ResumenEscolar)->gruposEnCurso()->firstWhere('id', $this->grupo->id)['lista_atrasada'])->toBeTrue();

    ClaseSuspendida::create(['grupo_id' => $this->grupo->id, 'fecha' => '2026-09-27', 'motivo' => 'profesor']);

    expect((new ResumenEscolar)->gruposEnCurso()->firstWhere('id', $this->grupo->id)['lista_atrasada'])->toBeFalse();

    $this->actingAs(actingAsAdmin())
        ->get("/grupos/{$this->grupo->id}")
        ->assertInertia(fn ($page) => $page->where('grupo.lista_atrasada', false)->where('grupo.dias_sin_lista', 11));
});

test('the roll call opens on the latest class actually held and explains a day without class', function () {
    ClaseSuspendida::create(['grupo_id' => $this->grupo->id, 'fecha' => '2026-09-27', 'motivo' => 'salud', 'observaciones' => 'Gripe']);

    $this->actingAs($this->profesorUser)
        ->get("/grupos/{$this->grupo->id}/asistencias")
        ->assertInertia(fn ($page) => $page->where('fecha', '2026-09-20')->where('sinClase', null)->where('canSuspend', true));

    $this->get("/grupos/{$this->grupo->id}/asistencias?fecha=2026-09-27")
        ->assertInertia(fn ($page) => $page
            ->where('sinClase.tipo', 'suspendida')
            ->where('sinClase.motivo', 'Salud')
            ->where('sinClase.observaciones', 'Gripe'));
});

test('today\'s classes show a suspended class as such and include make-up classes', function () {
    $this->travelTo('2026-09-27 10:00');
    $inscripcion = Inscripcion::factory()->create(['grupo_id' => $this->grupo->id]);
    ClaseSuspendida::create(['grupo_id' => $this->grupo->id, 'fecha' => '2026-09-27', 'motivo' => 'evento', 'fecha_reposicion' => '2026-09-30']);

    $clase = collect((new ResumenEscolar(profesorId: $this->profesor->id))->clasesDeHoy())->firstWhere('id', $this->grupo->id);
    expect($clase['sin_clase_hoy']['motivo'])->toBe('Evento');

    $this->travelTo('2026-09-30 10:00');
    $clase = collect((new ResumenEscolar(profesorId: $this->profesor->id))->clasesDeHoy())->firstWhere('id', $this->grupo->id);
    expect($clase)->not->toBeNull()->and($clase['sin_clase_hoy'])->toBeNull();
});

test('the school calendar lists holidays with the grupos they affect', function () {
    DiaSinClase::create(['fecha_inicio' => '2026-12-24', 'fecha_fin' => '2027-01-01', 'motivo' => 'Vacaciones de invierno']);
    DiaSinClase::create(['fecha_inicio' => '2026-09-16', 'fecha_fin' => '2026-09-16', 'motivo' => 'Independencia']);

    $this->actingAs(actingAsAdmin())
        ->get('/calendario')
        ->assertInertia(fn ($page) => $page
            ->component('calendario/index')
            ->has('dias', 1)
            ->where('dias.0.motivo', 'Vacaciones de invierno')
            ->where('dias.0.grupos.0.id', $this->grupo->id)
            ->where('conteos', ['proximos' => 1, 'pasados' => 1]));

    // Profesores can see it but not change it.
    $this->actingAs($this->profesorUser)->get('/calendario')->assertOk()->assertInertia(fn ($page) => $page->where('canManage', false));
    $this->post('/calendario', ['motivo' => 'Puente', 'fecha_inicio' => '2026-11-16', 'fecha_fin' => '2026-11-16'])->assertForbidden();
});

test('a director adds days without class only for their planteles', function () {
    $plantel = $this->grupo->plantel;
    $director = directorDe($plantel);
    $escolar = DiaSinClase::create(['fecha_inicio' => '2026-12-24', 'fecha_fin' => '2026-12-25', 'motivo' => 'Navidad']);

    $this->actingAs($director)
        ->post('/calendario', ['motivo' => 'Puente', 'fecha_inicio' => '2026-11-16', 'fecha_fin' => '2026-11-16'])
        ->assertSessionHasErrors(['plantel_id' => 'Elige el plantel.']);

    $this->post('/calendario', ['motivo' => 'Puente', 'fecha_inicio' => '2026-11-16', 'fecha_fin' => '2026-11-16', 'plantel_id' => Plantel::factory()->create()->id])
        ->assertSessionHasErrors('plantel_id');

    $this->post('/calendario', ['motivo' => 'Puente', 'fecha_inicio' => '2026-11-16', 'fecha_fin' => '2026-11-16', 'plantel_id' => $plantel->id])
        ->assertSessionHasNoErrors();

    $this->delete("/calendario/{$escolar->id}")->assertForbidden();

    $this->actingAs(actingAsAdmin())
        ->post('/calendario', ['motivo' => 'Año nuevo', 'fecha_inicio' => '2027-01-01', 'fecha_fin' => '2027-01-01'])
        ->assertSessionHasNoErrors();

    $this->post('/calendario', ['motivo' => 'Error', 'fecha_inicio' => '2026-01-01', 'fecha_fin' => '2026-12-31'])
        ->assertSessionHasErrors('fecha_fin');

    expect(DiaSinClase::whereNull('plantel_id')->count())->toBe(2)
        ->and(DiaSinClase::where('plantel_id', $plantel->id)->count())->toBe(1);
});
