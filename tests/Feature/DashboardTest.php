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
});

/**
 * Two planteles with a known mix of grupos, enrollments, drops and attendance:
 *  - A (San Miguel, en curso, cupo 4): a1 always present, a2 always absent (at risk), a3 only 2 records, a4 dropped this month.
 *  - B (Tlacolulan, en curso, no teacher, no roll call yet): b1.
 *  - C (San Miguel, planeado, should have started 3 days ago, no teacher).
 *  - D (San Miguel, concluido) taught by a second teacher who has nothing active.
 */
function escenarioEscolar(): array
{
    $sm = Plantel::factory()->create(['nombre' => 'CICCIS San Miguel', 'clave' => 'SM']);
    $tl = Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan', 'clave' => 'TL']);
    $barberia = Curso::factory()->create(['nombre' => 'Barbería']);
    $ingles = Curso::factory()->create(['nombre' => 'Inglés']);
    [$p1, $p2] = Profesor::factory(2)->create();

    $grupo = fn (array $atributos) => Grupo::factory()->create([
        'fecha_inicio' => now()->subDays(20)->toDateString(),
        'fecha_fin' => null,
        'cupo' => null,
        ...$atributos,
    ]);

    $a = $grupo(['plantel_id' => $sm->id, 'curso_id' => $barberia->id, 'profesor_id' => $p1->id, 'estado' => 'en_curso', 'cupo' => 4]);
    $b = $grupo(['plantel_id' => $tl->id, 'curso_id' => $ingles->id, 'profesor_id' => null, 'estado' => 'en_curso']);
    $c = $grupo(['plantel_id' => $sm->id, 'curso_id' => $barberia->id, 'profesor_id' => null, 'estado' => 'planeado', 'fecha_inicio' => now()->subDays(3)->toDateString()]);
    $grupo(['plantel_id' => $sm->id, 'curso_id' => $barberia->id, 'profesor_id' => $p2->id, 'estado' => 'concluido']);

    $inscribir = fn (Grupo $grupo, array $atributos = []) => Inscripcion::factory()->create(['grupo_id' => $grupo->id, 'alumno_id' => Alumno::factory()->create()->id, ...$atributos]);

    $a1 = $inscribir($a);
    $a2 = $inscribir($a);
    $a3 = $inscribir($a);
    $inscribir($a, ['estado' => 'baja', 'fecha_baja' => now()->toDateString(), 'motivo_baja' => 'Cambio de ciudad']);
    $inscribir($b);

    $lista = fn (Inscripcion $inscripcion, int $diasAtras, string $estado) => Asistencia::create([
        'inscripcion_id' => $inscripcion->id,
        'fecha' => now()->subDays($diasAtras)->toDateString(),
        'estado' => $estado,
    ]);

    foreach ([1, 2, 3] as $dias) {
        $lista($a1, $dias, 'presente');
        $lista($a2, $dias, 'falta');
    }
    $lista($a3, 1, 'falta');
    $lista($a3, 2, 'presente');

    return compact('sm', 'tl', 'a', 'b', 'c', 'a2', 'a3', 'p1');
}

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('admins get the school-wide dashboard with the right figures', function () {
    $escenario = escenarioEscolar();

    $this->actingAs(actingAsAdmin())
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/admin')
            ->where('kpis.alumnos_activos', 4)
            ->where('kpis.inscritos_mes', 5)
            ->where('kpis.grupos_en_curso', 2)
            ->where('kpis.grupos_planeados', 1)
            ->where('kpis.profesores_activos', 1)
            ->where('kpis.profesores_sin_grupo', 1)
            ->where('kpis.asistencia', 50)
            ->where('kpis.ocupacion', 75)
            ->where('kpis.lugares_libres', 1)
            ->where('kpis.bajas_mes', 1)
            ->has('planteles', 2)
            ->where('planteles', fn ($planteles) => collect($planteles)->pluck('alumnos', 'nombre')->all() === ['CICCIS San Miguel' => 3, 'CICCIS Tlacolulan' => 1])
            ->has('gruposEnCurso', 2)
            ->has('asistenciaSemanal', 12)
            ->has('movimientosMensuales', 6)
            ->where('movimientosMensuales.5.inscripciones', 5)
            ->where('movimientosMensuales.5.bajas', 1)
            ->where('bajasRecientes.0.motivo', 'Cambio de ciudad'));
});

test('alumnos at risk need low attendance and enough records', function () {
    $escenario = escenarioEscolar();

    $this->actingAs(actingAsAdmin())
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('alumnosEnRiesgo', 1)
            ->where('alumnosEnRiesgo.0.inscripcion_id', $escenario['a2']->id)
            ->where('alumnosEnRiesgo.0.porcentaje', 0));
});

test('pending items flag grupos without teacher, overdue starts and missing roll calls', function () {
    $escenario = escenarioEscolar();

    $this->actingAs(actingAsAdmin())
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('pendientes', function ($pendientes) use ($escenario) {
            $porTipo = collect($pendientes)->groupBy('tipo')->map(fn ($items) => $items->pluck('grupo_id')->sort()->values()->all());

            return $porTipo['sin_profesor'] === collect([$escenario['b']->id, $escenario['c']->id])->sort()->values()->all()
                && $porTipo['sin_iniciar'] === [$escenario['c']->id]
                && $porTipo['sin_lista'] === [$escenario['b']->id]
                && ! $porTipo->has('lleno');
        }));
});

test('the plantel filter narrows every figure to that plantel', function () {
    $escenario = escenarioEscolar();

    $this->actingAs(actingAsAdmin())
        ->get('/dashboard?plantel_id='.$escenario['sm']->id)
        ->assertInertia(fn ($page) => $page
            ->where('plantelId', $escenario['sm']->id)
            ->where('kpis.alumnos_activos', 3)
            ->where('kpis.grupos_en_curso', 1)
            ->where('kpis.profesores_sin_grupo', null)
            ->has('planteles', 0)
            ->has('gruposEnCurso', 1)
            ->where('gruposEnCurso.0.id', $escenario['a']->id));

    $this->actingAs(actingAsAdmin())
        ->get('/dashboard?plantel_id='.$escenario['tl']->id)
        ->assertInertia(fn ($page) => $page
            ->where('kpis.alumnos_activos', 1)
            ->where('kpis.asistencia', null)
            ->has('alumnosEnRiesgo', 0));
});

test('an unknown plantel filter falls back to all planteles', function () {
    $this->actingAs(actingAsAdmin())
        ->get('/dashboard?plantel_id=999')
        ->assertInertia(fn ($page) => $page->component('dashboard/admin')->where('plantelId', null));
});

function cuentaDeAlumno(Alumno $alumno): User
{
    $cuenta = User::factory()->create();
    $cuenta->assignRole('Alumno');
    $alumno->update(['user_id' => $cuenta->id]);

    return $cuenta;
}

test('alumnos get a dashboard of their own courses and attendance', function () {
    $escenario = escenarioEscolar();
    $inscripcion = $escenario['a2'];
    // Grupo A: started 20 days ago and runs 10 weeks, so today is in week 3.
    $escenario['a']->update(['fecha_fin' => now()->subDays(20)->addWeeks(10)->toDateString()]);
    // A course the alumno dropped earlier shows up among past courses.
    Inscripcion::factory()->create([
        'alumno_id' => $inscripcion->alumno_id,
        'grupo_id' => $escenario['c']->id,
        'estado' => 'baja',
        'fecha_baja' => now()->subDay()->toDateString(),
    ]);

    $this->actingAs(cuentaDeAlumno($inscripcion->alumno))
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/alumno')
            ->where('sinFicha', false)
            ->where('alumno.matricula', $inscripcion->alumno->matricula)
            ->where('kpis.cursos_en_curso', 1)
            ->where('kpis.asistencia', 0)
            ->where('kpis.faltas', 3)
            ->has('cursos', 1)
            ->where('cursos.0.inscripcion_id', $inscripcion->id)
            ->where('cursos.0.asistencia.porcentaje', 0)
            ->where('cursos.0.asistencia.en_riesgo', true)
            ->where('cursos.0.avance.semana', 3)
            ->where('cursos.0.avance.semanas', 10)
            ->has('historial', 3)
            ->where('historial.0.fecha', now()->subDay()->toDateString())
            ->where('historial.0.estado', 'falta')
            ->has('anteriores', 1)
            ->where('anteriores.0.resultado', 'baja'));
});

test('alumnos see only their own records', function () {
    $escenario = escenarioEscolar();

    // a3 has 2 records in the same grupo as a2 (who has 3); neither sees the other's.
    $this->actingAs(cuentaDeAlumno($escenario['a3']->alumno))
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('historial', 2)
            ->where('cursos.0.asistencia.total', 2)
            ->where('cursos.0.asistencia.en_riesgo', false));
});

test('an alumno sees today\'s classes with their attendance once taken, and when a planned course starts', function () {
    $escenario = escenarioEscolar();
    $inscripcion = $escenario['a2'];
    $escenario['a']->update(['dias' => Grupo::DIAS[now()->dayOfWeekIso - 1], 'hora_inicio' => '16:00', 'hora_fin' => '18:00']);
    $planeado = Grupo::factory()->create(['estado' => 'planeado', 'fecha_inicio' => now()->addDays(5)->toDateString()]);
    Inscripcion::factory()->create(['alumno_id' => $inscripcion->alumno_id, 'grupo_id' => $planeado->id]);
    $cuenta = cuentaDeAlumno($inscripcion->alumno);

    $this->actingAs($cuenta)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('clasesDeHoy', 1)
            ->where('clasesDeHoy.0.asistencia_hoy', null)
            ->where('kpis.cursos_por_iniciar', 1)
            ->where('cursos.1.estado_grupo', 'planeado')
            ->where('cursos.1.avance.dias_para_inicio', 5));

    Asistencia::create(['inscripcion_id' => $inscripcion->id, 'fecha' => now()->toDateString(), 'estado' => 'retardo']);

    $this->actingAs($cuenta)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('clasesDeHoy.0.asistencia_hoy', 'retardo')->where('kpis.retardos', 1));
});

test('an alumno account without an alumno record gets a notice', function () {
    $user = User::factory()->create();
    $user->assignRole('Alumno');

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/alumno')->where('sinFicha', true)->missing('cursos'));
});

/** The account of the scenario's first teacher (who teaches grupo A at San Miguel). */
function cuentaDeProfesor(Profesor $profesor): User
{
    $cuenta = User::factory()->create();
    $cuenta->assignRole('Profesor');
    $profesor->update(['user_id' => $cuenta->id]);

    return $cuenta;
}

test('profesores get a dashboard of their own grupos', function () {
    $escenario = escenarioEscolar();

    $this->actingAs(cuentaDeProfesor($escenario['p1']))
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/profesor')
            ->where('sinFicha', false)
            ->where('kpis.alumnos_activos', 3)
            ->where('kpis.grupos_en_curso', 1)
            ->where('kpis.asistencia', 50)
            ->has('gruposEnCurso', 1)
            ->where('gruposEnCurso.0.id', $escenario['a']->id)
            ->has('alumnosEnRiesgo', 1)
            ->where('alumnosEnRiesgo.0.inscripcion_id', $escenario['a2']->id)
            ->has('listasPendientes', 0)
            ->has('proximosGrupos', 0)
            ->has('asistenciaSemanal', 12)
            ->where('variosPlanteles', false));
});

test('today\'s classes list the grupos that meet today and whether the roll call is done', function () {
    $escenario = escenarioEscolar();
    $hoy = Grupo::DIAS[now()->dayOfWeekIso - 1];
    $otroDia = Grupo::DIAS[now()->dayOfWeekIso % 7];
    $escenario['a']->update(['dias' => $hoy, 'hora_inicio' => '09:00', 'hora_fin' => '11:00']);
    $cuenta = cuentaDeProfesor($escenario['p1']);

    $this->actingAs($cuenta)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('clasesDeHoy', 1)
            ->where('clasesDeHoy.0.id', $escenario['a']->id)
            ->where('clasesDeHoy.0.lista_tomada', false));

    Asistencia::create(['inscripcion_id' => $escenario['a2']->id, 'fecha' => now()->toDateString(), 'estado' => 'presente']);

    $this->actingAs($cuenta)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('clasesDeHoy.0.lista_tomada', true));

    $escenario['a']->update(['dias' => $otroDia]);

    $this->actingAs($cuenta)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->has('clasesDeHoy', 0));
});

test('profesores see their overdue roll calls across planteles', function () {
    $escenario = escenarioEscolar();
    // Grupo B (Tlacolulan) started 20 days ago, has an alumno and no roll call yet.
    $escenario['b']->update(['profesor_id' => $escenario['p1']->id]);

    $this->actingAs(cuentaDeProfesor($escenario['p1']))
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('gruposEnCurso', 2)
            ->has('listasPendientes', 1)
            ->where('listasPendientes.0.grupo_id', $escenario['b']->id)
            ->where('variosPlanteles', true));
});

test('a profesor account without a profesor record gets a notice', function () {
    $user = User::factory()->create();
    $user->assignRole('Profesor');

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard/profesor')->where('sinFicha', true)->missing('kpis'));
});

test('users without a role also get the simple start page', function () {
    $this->actingAs(User::factory()->create())
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->component('dashboard'));
});

test('directors get a dashboard limited to the plantel they run', function () {
    $escenario = escenarioEscolar();

    $this->actingAs(directorDe($escenario['sm']))
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/director')
            ->where('sinPlantel', false)
            ->where('plantelId', null)
            ->has('plantelesFiltro', 1)
            ->has('planteles', 0)
            ->where('kpis.alumnos_activos', 3)
            ->where('kpis.grupos_en_curso', 1)
            ->where('kpis.profesores_sin_grupo', null)
            ->has('gruposEnCurso', 1)
            ->where('gruposEnCurso.0.id', $escenario['a']->id)
            ->has('proximosGrupos', 1)
            ->where('proximosGrupos.0.id', $escenario['c']->id)
            ->where('proximosGrupos.0.dias_para_inicio', -3)
            ->has('profesores', 1)
            ->where('profesores.0.grupos_activos', 1)
            ->where('profesores.0.alumnos', 3)
            ->where('profesores.0.asistencia', 50)
            ->where('profesores.0.grupos_sin_lista', 0)
            ->where('pendientes', fn ($pendientes) => collect($pendientes)->every(fn ($p) => $p['grupo_id'] !== $escenario['b']->id)));
});

test('directors of several planteles see each one and can filter among them only', function () {
    $escenario = escenarioEscolar();
    $director = directorDe($escenario['sm'], $escenario['tl']);

    $this->actingAs($director)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page
            ->has('plantelesFiltro', 2)
            ->has('planteles', 2)
            ->where('kpis.alumnos_activos', 4));

    $this->actingAs($director)
        ->get('/dashboard?plantel_id='.$escenario['tl']->id)
        ->assertInertia(fn ($page) => $page
            ->where('plantelId', $escenario['tl']->id)
            ->has('planteles', 0)
            ->where('kpis.alumnos_activos', 1));

    // A plantel the director doesn't run is ignored.
    $this->actingAs(directorDe($escenario['sm']))
        ->get('/dashboard?plantel_id='.$escenario['tl']->id)
        ->assertInertia(fn ($page) => $page->where('plantelId', null)->where('kpis.alumnos_activos', 3));
});

test('directors without a plantel get a notice instead of figures', function () {
    escenarioEscolar();

    $this->actingAs(directorDe())
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard/director')
            ->where('sinPlantel', true)
            ->missing('kpis'));
});
