<?php

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\Calificacion;
use App\Models\Curso;
use App\Models\Director;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use App\Support\Dashboard\ResumenEscolar;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('the database seeder sets up roles, permissions and the first administrator', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Role::pluck('name')->sort()->values()->all())->toBe(['Admin', 'Alumno', 'Director', 'Profesor'])
        ->and(Permission::count())->toBe(19)
        ->and(Role::findByName('Admin')->permissions)->toHaveCount(19);

    $admin = User::where('email', 'admin@example.com')->firstOrFail();

    expect($admin->hasRole('Admin'))->toBeTrue()
        ->and(Hash::check('password', $admin->password))->toBeTrue();
});

test('the database seeder creates both planteles, active', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Plantel::orderBy('clave')->get(['clave', 'codigo_postal', 'activo'])->toArray())->toBe([
        ['clave' => 'RL', 'codigo_postal' => '91315', 'activo' => true],
        ['clave' => 'TL', 'codigo_postal' => '91350', 'activo' => true],
    ]);
});

test('the database seeder creates the 5 courses, offered at both planteles', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Curso::orderBy('clave')->pluck('duracion_semanas', 'clave')->all())->toBe([
        'BAR' => 35,
        'ENF' => 78,
        'EST' => 78,
        'INF' => 52,
        'ING' => 65,
    ])->and(Curso::whereNull('descripcion')->exists())->toBeFalse();

    foreach (Plantel::all() as $plantel) {
        expect($plantel->cursos()->count())->toBe(5);
    }
});

test('the database seeder creates the study plan of Alto Estilismo, adding up to the curso duration', function () {
    $this->seed(DatabaseSeeder::class);

    $curso = Curso::where('clave', 'EST')->firstOrFail();

    expect($curso->modulos->pluck('duracion_semanas', 'nombre')->all())->toBe([
        'Maquillaje Profesional y Diseño de Cejas' => 9,
        'Tratamientos Capilares y Peinados' => 8,
        'Aplicación de Uñas Acrílicas' => 9,
        'Permacología y Keratinas' => 11,
        'Cortes Clásicos y Barbería Profesional' => 28,
        'Colorimetría Profesional' => 13,
    ])->and($curso->modulos->sum('duracion_semanas'))->toBe($curso->duracion_semanas)
        ->and($curso->modulos->pluck('orden')->all())->toBe([1, 2, 3, 4, 5, 6])
        ->and($curso->modulos->whereNull('descripcion'))->toBeEmpty();
});

test('the database seeder creates the study plan of Barbería, adding up to the curso duration', function () {
    $this->seed(DatabaseSeeder::class);

    $curso = Curso::where('clave', 'BAR')->firstOrFail();

    expect($curso->modulos->pluck('duracion_semanas', 'nombre')->all())->toBe([
        'Fundamentos de Barbería' => 8,
        'Técnicas Base de Corte' => 8,
        'Degradados / Fades' => 9,
        'Cortes Modernos, Textura y Diseño' => 4,
        'Barba, Afeitado y Diseño Masculino' => 3,
        'Atención al Cliente y Emprendimiento' => 3,
    ])->and($curso->modulos->sum('duracion_semanas'))->toBe($curso->duracion_semanas);
});

test('the database seeder creates the study plan of Informática, adding up to the curso duration', function () {
    $this->seed(DatabaseSeeder::class);

    $curso = Curso::where('clave', 'INF')->firstOrFail();

    expect($curso->modulos)->toHaveCount(11)
        ->and($curso->modulos->first()->nombre)->toBe('Introducción a la Informática y Ambiente Windows')
        ->and($curso->modulos->last()->nombre)->toBe('Proyecto Integrador de Informática Administrativa')
        ->and($curso->modulos->pluck('duracion_semanas')->all())->toBe([4, 3, 8, 10, 5, 6, 3, 3, 5, 2, 3])
        ->and($curso->modulos->sum('duracion_semanas'))->toBe($curso->duracion_semanas);
});

test('the database seeder creates the study plan of Enfermería, adding up to the curso duration', function () {
    $this->seed(DatabaseSeeder::class);

    $curso = Curso::where('clave', 'ENF')->firstOrFail();

    expect($curso->modulos)->toHaveCount(14)
        ->and($curso->modulos->first()->nombre)->toBe('Introducción a la Enfermería y Ética Profesional')
        ->and($curso->modulos->last()->nombre)->toBe('Prácticas Clínicas e Integración Profesional')
        ->and($curso->modulos->pluck('duracion_semanas')->all())->toBe([4, 8, 6, 10, 4, 8, 7, 8, 7, 4, 4, 3, 2, 3])
        ->and($curso->modulos->sum('duracion_semanas'))->toBe($curso->duracion_semanas);
});

test('the database seeder creates the study plan of Inglés, adding up to the curso duration', function () {
    $this->seed(DatabaseSeeder::class);

    $curso = Curso::where('clave', 'ING')->firstOrFail();

    expect($curso->modulos)->toHaveCount(12)
        ->and($curso->modulos->first()->nombre)->toBe('Fundamentos del Inglés')
        ->and($curso->modulos->last()->nombre)->toBe('Proyecto Integrador y Evaluación Final')
        ->and($curso->modulos->pluck('duracion_semanas')->all())->toBe([5, 6, 6, 6, 5, 7, 7, 6, 5, 5, 4, 3])
        ->and($curso->modulos->sum('duracion_semanas'))->toBe($curso->duracion_semanas);
});

test('every curso has a study plan', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Curso::doesntHave('modulos')->pluck('clave')->all())->toBe([]);
});

test('the database seeder creates the director, running both planteles', function () {
    $this->seed(DatabaseSeeder::class);

    $user = User::where('email', 'director@example.com')->firstOrFail();

    expect($user->hasRole('Director'))->toBeTrue()
        ->and($user->director->nombre_completo)->toBe('Nicolás Ramírez Ortega')
        ->and($user->profesor)->toBeNull()
        ->and($user->director->planteles()->orderBy('clave')->pluck('clave')->all())->toBe(['RL', 'TL']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->component('dashboard/director')->where('sinPlantel', false));
});

test('the database seeder creates the 4 profesores, each with their own account', function () {
    $this->seed(DatabaseSeeder::class);

    $profesores = Profesor::with('user')->orderBy('nombre')->get();

    expect($profesores->pluck('nombre')->all())->toBe(['Beatriz', 'Eduardo', 'Guadalupe', 'Nicolás']);

    foreach ($profesores as $profesor) {
        expect($profesor->activo)->toBeTrue()
            ->and($profesor->user->hasRole('Profesor'))->toBeTrue()
            ->and($profesor->email)->toBe($profesor->user->email);
    }
});

test('the director teaches with a separate profesor account', function () {
    $this->seed(DatabaseSeeder::class);

    $cuentaProfesor = User::where('email', 'nicolas@example.com')->firstOrFail();

    expect($cuentaProfesor->hasRole('Director'))->toBeFalse()
        ->and($cuentaProfesor->profesor->nombre_completo)->toBe('Nicolás Ramírez Ortega');

    $this->actingAs($cuentaProfesor)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->component('dashboard/profesor')->where('sinFicha', false));
});

test('the database seeder creates the real schedule of both planteles', function () {
    $this->seed(DatabaseSeeder::class);

    $grupos = Grupo::with('profesor')->orderBy('clave')->get()->keyBy('clave');

    expect($grupos->keys()->all())->toBe([
        'BAR-RL-2026-A', 'BAR-TL-2026-A', 'ENF-RL-2026-A', 'ENF-TL-2026-A', 'EST-RL-2026-A',
        'EST-TL-2026-A', 'INF-RL-2026-A', 'INF-TL-2026-A', 'ING-RL-2026-A', 'ING-TL-2026-A',
    ])->and($grupos->pluck('cupo')->unique()->all())->toBe([10]);

    $ingles = $grupos['ING-RL-2026-A'];
    expect($ingles->estado)->toBe('en_curso')
        ->and($ingles->dias)->toBe('Vie')
        ->and($ingles->fecha_inicio->toDateString())->toBe('2026-06-19')
        ->and($ingles->fecha_fin->toDateString())->toBe('2027-09-17') // 65 semanas
        ->and($ingles->profesor->nombre)->toBe('Guadalupe');

    $estilismo = $grupos['EST-TL-2026-A'];
    expect($estilismo->estado)->toBe('planeado')
        ->and($estilismo->dias)->toBe('Sáb')
        ->and($estilismo->fecha_inicio->toDateString())->toBe('2026-10-24')
        ->and(substr($estilismo->hora_inicio, 0, 5))->toBe('12:30')
        ->and($estilismo->profesor->nombre)->toBe('Beatriz');

    expect($grupos->where('estado', 'en_curso')->every(fn ($grupo) => $grupo->plantel->clave === 'RL'))->toBeTrue();
});

test('the database seeder enrolls alumnos in every grupo', function () {
    $this->seed(DatabaseSeeder::class);

    $activos = fn (string $clave) => Grupo::where('clave', $clave)->firstOrFail()->inscripciones()->where('estado', 'activo')->count();

    foreach (['ING', 'BAR', 'ENF', 'INF', 'EST'] as $curso) {
        expect($activos("{$curso}-RL-2026-A"))->toBeGreaterThanOrEqual(7)->toBeLessThanOrEqual(10)
            ->and($activos("{$curso}-TL-2026-A"))->toBe(3);
    }

    expect(Inscripcion::where('estado', 'baja')->count())->toBe(2)
        ->and(Inscripcion::where('estado', 'baja')->with('grupo.plantel')->get()->every(fn ($inscripcion) => $inscripcion->grupo->plantel->clave === 'RL'))->toBeTrue()
        ->and(Alumno::whereHas('inscripciones', null, '>=', 2)->count())->toBe(2)
        ->and(Alumno::where('matricula', 'not like', '2026-____')->exists())->toBeFalse();
});

test('the demo alumno takes Barbería and Estilismo with a login account', function () {
    $this->seed(DatabaseSeeder::class);

    $user = User::where('email', 'alumno@example.com')->firstOrFail();

    expect($user->hasRole('Alumno'))->toBeTrue()
        ->and(User::role('Alumno')->count())->toBe(1)
        ->and($user->alumno->grupos()->orderBy('clave')->pluck('clave')->all())->toBe(['BAR-RL-2026-A', 'EST-RL-2026-A']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->component('dashboard/alumno')->has('cursos', 2));
});

test('the database seeder takes attendance in the running grupos until yesterday', function () {
    $this->travelTo('2026-09-30 10:00');
    $this->seed(DatabaseSeeder::class);

    $ingles = Grupo::where('clave', 'ING-RL-2026-A')->firstOrFail();
    $fechas = $ingles->asistencias()->pluck('fecha')->map(fn ($fecha) => Carbon::parse($fecha)->toDateString())->unique()->sort()->values();

    // Every Friday from 19 June to 25 September.
    expect($fechas->first())->toBe('2026-06-19')
        ->and($fechas->last())->toBe('2026-09-25')
        ->and($fechas)->toHaveCount(15);

    // Tlacolulan hasn't started; the drop-outs stop at their fecha_baja.
    expect(Asistencia::whereHas('inscripcion.grupo', fn ($query) => $query->where('estado', 'planeado'))->exists())->toBeFalse();

    foreach (Inscripcion::where('estado', 'baja')->get() as $baja) {
        expect($baja->asistencias()->max('fecha'))->toBeLessThanOrEqual($baja->fecha_baja->toDateString().' 23:59:59');
    }

    $resumen = new ResumenEscolar;

    expect(count($resumen->alumnosEnRiesgo()))->toBeGreaterThanOrEqual(2)
        ->and(collect($resumen->listasPendientes())->pluck('clave')->all())->toContain('ENF-RL-2026-A');
});

test('the database seeder grades the finished modules of the running grupos', function () {
    $this->travelTo('2026-09-30 10:00');
    $this->seed(DatabaseSeeder::class);

    // Estilismo RL (from 21 June, on Sundays): only module 1 (9 weeks) has finished, its exam on its last class.
    $estilismo = Grupo::where('clave', 'EST-RL-2026-A')->firstOrFail();
    $notas = Calificacion::whereIn('inscripcion_id', $estilismo->inscripciones()->select('id'))->get();

    expect($notas->pluck('curso_modulo_id')->unique()->all())->toBe([$estilismo->curso->modulos->first()->id])
        ->and($notas->pluck('fecha_evaluacion')->map->toDateString()->unique()->all())->toBe(['2026-08-16'])
        ->and($notas->every(fn (Calificacion $nota) => $nota->calificacion >= 0 && $nota->calificacion <= 10))->toBeTrue();

    // Retakes only for failed grades; nobody in the planned grupos has grades.
    expect(Calificacion::whereNotNull('recuperacion')->where('calificacion', '>=', 6)->exists())->toBeFalse()
        ->and(Calificacion::whereHas('inscripcion.grupo', fn ($query) => $query->where('estado', 'planeado'))->exists())->toBeFalse();

    // Informática's latest finished module is left for its teacher to grade.
    expect(collect((new ResumenEscolar)->calificacionesPendientes())->pluck('clave')->all())->toBe(['INF-RL-2026-A']);
});

test('the database seeder can run twice', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    $asistencias = Asistencia::count();
    $calificaciones = Calificacion::count();
    $alumnos = Alumno::orderBy('matricula')->pluck('nombre', 'matricula')->all();
    $this->seed(DatabaseSeeder::class);

    expect(Alumno::orderBy('matricula')->pluck('nombre', 'matricula')->all())->toBe($alumnos)
        ->and(User::count())->toBe(7)
        ->and(Profesor::count())->toBe(4)
        ->and(Grupo::count())->toBe(10)
        ->and(Alumno::count())->toBe(57)
        ->and(Inscripcion::count())->toBe(59)
        ->and(Asistencia::count())->toBe($asistencias)
        ->and(Calificacion::count())->toBe($calificaciones)
        ->and(Director::count())->toBe(1)
        ->and(DB::table('plantel_user')->count())->toBe(2)
        ->and(Role::count())->toBe(4)
        ->and(Plantel::count())->toBe(2)
        ->and(Curso::count())->toBe(5)
        ->and(DB::table('curso_modulos')->count())->toBe(49)
        ->and(DB::table('curso_plantel')->count())->toBe(10);
});
