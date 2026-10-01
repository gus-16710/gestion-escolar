<?php

namespace App\Support\Dashboard;

use App\Models\Asistencia;
use App\Models\DiaSinClase;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Support\CalendarioGrupo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * School-wide figures for the dashboards, optionally narrowed to one plantel.
 *
 * Aggregations run in SQL; grouping by week or month happens in PHP from date(...) so the
 * same code works on MySQL and on the SQLite test database.
 */
class ResumenEscolar
{
    /** Minimum records before an alumno's attendance percentage is considered meaningful. */
    public const MIN_REGISTROS_RIESGO = 3;

    /** Below this attendance percentage an alumno is flagged as at risk. */
    public const UMBRAL_RIESGO = 80;

    /** Days without a roll call before an in-progress grupo is flagged. */
    public const DIAS_SIN_LISTA = 7;

    private ?Collection $gruposEnCurso = null;

    /**
     * @param  array<int, int>|null  $plantelIds  null means every plantel.
     * @param  int|null  $profesorId  only the grupos this profesor teaches (the profesor dashboard).
     */
    public function __construct(
        private readonly ?array $plantelIds = null,
        private readonly ?int $profesorId = null,
    ) {}

    /**
     * Everything the admin and director dashboards share.
     *
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'kpis' => $this->kpis(),
            'planteles' => $this->unSoloPlantel() ? [] : $this->planteles(),
            'alumnosPorCurso' => $this->alumnosPorCurso(),
            'asistenciaSemanal' => $this->asistenciaSemanal(),
            'movimientosMensuales' => $this->movimientosMensuales(),
            'gruposEnCurso' => $this->gruposEnCurso()->values()->all(),
            'alumnosEnRiesgo' => $this->alumnosEnRiesgo(),
            'pendientes' => $this->pendientes(),
            'bajasRecientes' => $this->bajasRecientes(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function kpis(): array
    {
        $hoy = now()->startOfDay();
        $inicioMes = now()->startOfMonth();

        $asistenciaActual = $this->totalesAsistencia($hoy->copy()->subDays(29), $hoy);
        $asistenciaAnterior = $this->totalesAsistencia($hoy->copy()->subDays(59), $hoy->copy()->subDays(30));

        $gruposActivos = $this->grupos()
            ->whereIn('estado', Grupo::ESTADOS_ACTIVOS)
            ->whereNotNull('cupo')
            ->withCount(['inscripciones as inscritos' => fn ($query) => $query->where('estado', 'activo')])
            ->get(['id', 'cupo']);

        $cupo = (int) $gruposActivos->sum('cupo');
        $inscritosConCupo = (int) $gruposActivos->sum('inscritos');

        $profesoresConGrupo = Profesor::where('activo', true)
            ->whereHas('grupos', fn ($query) => $this->filtrarGrupos($query)->whereIn('estado', Grupo::ESTADOS_ACTIVOS))
            ->count();

        return [
            'alumnos_activos' => $this->inscripciones()->where('estado', 'activo')->whereHas('alumno')->distinct()->count('alumno_id'),
            'inscritos_mes' => $this->inscripciones()->where('fecha_inscripcion', '>=', $inicioMes->toDateString())->count(),
            'grupos_en_curso' => $this->grupos()->where('estado', 'en_curso')->count(),
            'grupos_planeados' => $this->grupos()->where('estado', 'planeado')->count(),
            'profesores_activos' => $profesoresConGrupo,
            // "Without a grupo" only makes sense school-wide: a teacher can't be "unassigned" within one plantel.
            'profesores_sin_grupo' => $this->plantelIds !== null ? null : Profesor::where('activo', true)->count() - $profesoresConGrupo,
            'asistencia' => Asistencia::porcentaje($asistenciaActual['total'], $asistenciaActual['faltas']),
            'asistencia_anterior' => Asistencia::porcentaje($asistenciaAnterior['total'], $asistenciaAnterior['faltas']),
            'ocupacion' => $cupo > 0 ? (int) round(100 * $inscritosConCupo / $cupo) : null,
            'lugares_libres' => max(0, $cupo - $inscritosConCupo),
            'bajas_mes' => $this->bajasEntre($inicioMes, now()),
            'bajas_mes_anterior' => $this->bajasEntre($inicioMes->copy()->subMonth(), $inicioMes->copy()->subDay()),
        ];
    }

    /**
     * One summary per plantel in scope (not shown when the scope is a single plantel).
     *
     * @return array<int, array<string, mixed>>
     */
    public function planteles(): array
    {
        $alumnos = $this->inscripcionesActivasQuery()
            ->selectRaw('grupos.plantel_id, count(distinct inscripciones.alumno_id) as total')
            ->groupBy('grupos.plantel_id')
            ->pluck('total', 'plantel_id');

        $profesores = DB::table('grupos')
            ->whereNull('deleted_at')
            ->whereIn('estado', Grupo::ESTADOS_ACTIVOS)
            ->whereNotNull('profesor_id')
            ->selectRaw('plantel_id, count(distinct profesor_id) as total')
            ->groupBy('plantel_id')
            ->pluck('total', 'plantel_id');

        return Plantel::query()
            ->when($this->plantelIds !== null, fn ($query) => $query->whereIn('id', $this->plantelIds))
            ->withCount(['cursos', 'grupos as grupos_activos' => fn ($query) => $query->whereIn('estado', Grupo::ESTADOS_ACTIVOS)])
            ->orderByDesc('activo')
            ->orderBy('nombre')
            ->get()
            ->map(fn (Plantel $plantel) => [
                'id' => $plantel->id,
                'nombre' => $plantel->nombre,
                'localidad' => $plantel->localidad,
                'activo' => $plantel->activo,
                'alumnos' => (int) ($alumnos[$plantel->id] ?? 0),
                'grupos_activos' => $plantel->grupos_activos,
                'profesores' => (int) ($profesores[$plantel->id] ?? 0),
                'cursos' => $plantel->cursos_count,
            ])
            ->all();
    }

    /**
     * Distinct alumnos with an active enrollment, per curso, largest first.
     *
     * @return array<int, array{curso: string, alumnos: int}>
     */
    public function alumnosPorCurso(): array
    {
        return $this->inscripcionesActivasQuery()
            ->join('cursos', 'cursos.id', '=', 'grupos.curso_id')
            ->selectRaw('cursos.nombre as curso, count(distinct inscripciones.alumno_id) as alumnos')
            ->groupBy('cursos.id', 'cursos.nombre')
            ->orderByDesc('alumnos')
            ->orderBy('cursos.nombre')
            ->get()
            ->map(fn ($fila) => ['curso' => $fila->curso, 'alumnos' => (int) $fila->alumnos])
            ->all();
    }

    /**
     * Attendance percentage for each of the last 12 weeks (Monday-based), oldest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function asistenciaSemanal(int $semanas = 12): array
    {
        $inicio = now()->startOfWeek()->subWeeks($semanas - 1);

        $porDia = $this->asistenciasQuery()
            ->where('asistencias.fecha', '>=', $inicio->toDateString())
            ->selectRaw('date(asistencias.fecha) as dia, count(*) as total')
            ->selectRaw("sum(case when asistencias.estado = 'falta' then 1 else 0 end) as faltas")
            ->groupBy('dia')
            ->get();

        $porSemana = $porDia->groupBy(fn ($fila) => Carbon::parse($fila->dia)->startOfWeek()->toDateString());

        return collect(range(0, $semanas - 1))->map(function (int $i) use ($inicio, $porSemana) {
            $semana = $inicio->copy()->addWeeks($i);
            $filas = $porSemana->get($semana->toDateString(), collect());
            $total = (int) $filas->sum('total');
            $faltas = (int) $filas->sum('faltas');

            return [
                'semana' => $semana->toDateString(),
                'etiqueta' => $semana->translatedFormat('j M'),
                'total' => $total,
                'faltas' => $faltas,
                'porcentaje' => Asistencia::porcentaje($total, $faltas),
            ];
        })->all();
    }

    /**
     * New enrollments and drops per month for the last 6 months, oldest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function movimientosMensuales(int $meses = 6): array
    {
        $inicio = now()->startOfMonth()->subMonths($meses - 1);

        $inscripciones = $this->porMes(
            $this->inscripciones()->where('fecha_inscripcion', '>=', $inicio->toDateString()),
            'fecha_inscripcion',
        );

        $bajas = $this->porMes(
            $this->inscripciones()->where('estado', 'baja')->where('fecha_baja', '>=', $inicio->toDateString()),
            'fecha_baja',
        );

        return collect(range(0, $meses - 1))->map(function (int $i) use ($inicio, $inscripciones, $bajas) {
            $mes = $inicio->copy()->addMonths($i);
            $clave = $mes->format('Y-m');

            return [
                'mes' => $clave,
                'etiqueta' => ucfirst($mes->translatedFormat('M Y')),
                'inscripciones' => (int) ($inscripciones[$clave] ?? 0),
                'bajas' => (int) ($bajas[$clave] ?? 0),
            ];
        })->all();
    }

    /**
     * In-progress grupos with occupancy, 30-day attendance and last roll call.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function gruposEnCurso(): Collection
    {
        if ($this->gruposEnCurso !== null) {
            return $this->gruposEnCurso;
        }

        $grupos = $this->grupos()
            ->where('estado', 'en_curso')
            ->with(['plantel:id,nombre', 'curso:id,nombre,duracion_semanas', 'profesor', 'clasesSuspendidas'])
            ->withCount(['inscripciones as inscritos' => fn ($query) => $query->where('estado', 'activo')])
            ->orderBy('fecha_inicio')
            ->get();

        $desde = now()->subDays(29)->toDateString();
        $diasSinClase = DiaSinClase::all();
        $hoy = now()->startOfDay();

        $asistencia = DB::table('asistencias')
            ->join('inscripciones', 'inscripciones.id', '=', 'asistencias.inscripcion_id')
            ->whereIn('inscripciones.grupo_id', $grupos->pluck('id'))
            ->selectRaw('inscripciones.grupo_id')
            ->selectRaw('sum(case when asistencias.fecha >= ? then 1 else 0 end) as total', [$desde])
            ->selectRaw("sum(case when asistencias.fecha >= ? and asistencias.estado = 'falta' then 1 else 0 end) as faltas", [$desde])
            ->selectRaw('max(date(asistencias.fecha)) as ultima')
            ->groupBy('inscripciones.grupo_id')
            ->get()
            ->keyBy('grupo_id');

        return $this->gruposEnCurso = $grupos->map(function (Grupo $grupo) use ($asistencia, $diasSinClase, $hoy) {
            $fila = $asistencia->get($grupo->id);
            $ultima = $fila?->ultima ? Carbon::parse($fila->ultima) : null;
            $calendario = new CalendarioGrupo($grupo, $diasSinClase);
            $sinClaseHoy = $calendario->sinClaseEn($hoy);
            $registros = (int) ($fila->total ?? 0);
            $faltas = (int) ($fila->faltas ?? 0);

            $datos = [
                'id' => $grupo->id,
                'clave' => $grupo->clave,
                'curso' => $grupo->curso->nombre,
                'plantel' => $grupo->plantel->nombre,
                'profesor_id' => $grupo->profesor_id,
                'profesor' => $grupo->profesor?->nombre_completo,
                'profesor_foto_url' => $grupo->profesor?->fotoUrl(),
                'turno' => $grupo->turno,
                'dias' => $grupo->dias,
                'hora_inicio' => $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5) : null,
                'hora_fin' => $grupo->hora_fin ? substr($grupo->hora_fin, 0, 5) : null,
                'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                'inscritos' => $grupo->inscritos,
                'cupo' => $grupo->cupo,
                'registros_30' => $registros,
                'faltas_30' => $faltas,
                'asistencia' => Asistencia::porcentaje($registros, $faltas),
                'ultima_lista' => $ultima?->format('Y-m-d'),
                'dias_sin_lista' => $ultima ? (int) $ultima->diffInDays(now()->startOfDay()) : null,
                // The latest class day that had no class (holiday or suspension) also counts as up to date.
                'ultima_sin_clase' => $calendario->ultimaSinClase($hoy)?->format('Y-m-d'),
                'hay_clase_hoy' => $calendario->hayClase($hoy),
                'sin_clase_hoy' => $calendario->esDiaDeClase($hoy) ? $sinClaseHoy : null,
            ];

            return [...$datos, 'lista_atrasada' => $this->listaAtrasada($datos)];
        });
    }

    /**
     * Alumnos in in-progress grupos whose attendance fell below the threshold, worst first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function alumnosEnRiesgo(int $limite = 8): array
    {
        return $this->inscripciones()
            ->where('estado', 'activo')
            ->whereHas('grupo', fn ($query) => $query->where('estado', 'en_curso'))
            ->whereHas('alumno')
            ->with(['alumno', 'grupo:id,clave,curso_id', 'grupo.curso:id,nombre'])
            ->withCount([
                'asistencias as total_registros',
                'asistencias as faltas' => fn ($query) => $query->where('estado', 'falta'),
            ])
            ->get()
            ->filter(fn (Inscripcion $inscripcion) => $inscripcion->total_registros >= self::MIN_REGISTROS_RIESGO)
            ->map(fn (Inscripcion $inscripcion) => [
                'inscripcion_id' => $inscripcion->id,
                'alumno_id' => $inscripcion->alumno_id,
                'nombre_completo' => $inscripcion->alumno->nombre_completo,
                'matricula' => $inscripcion->alumno->matricula,
                'foto_url' => $inscripcion->alumno->fotoUrl(),
                'grupo_id' => $inscripcion->grupo_id,
                'grupo' => $inscripcion->grupo->clave,
                'curso' => $inscripcion->grupo->curso->nombre,
                'faltas' => $inscripcion->faltas,
                'total' => $inscripcion->total_registros,
                'porcentaje' => Asistencia::porcentaje($inscripcion->total_registros, $inscripcion->faltas),
            ])
            ->filter(fn (array $fila) => $fila['porcentaje'] < self::UMBRAL_RIESGO)
            ->sortBy('porcentaje')
            ->take($limite)
            ->values()
            ->all();
    }

    /**
     * Things someone should act on, each pointing at the grupo to open.
     *
     * @return array<int, array{tipo: string, mensaje: string, grupo_id: int, clave: string}>
     */
    public function pendientes(): array
    {
        $pendientes = collect();
        $hoy = now()->startOfDay();

        foreach ($this->grupos()->whereIn('estado', Grupo::ESTADOS_ACTIVOS)->whereNull('profesor_id')->with('curso:id,nombre')->get() as $grupo) {
            $pendientes->push($this->pendiente('sin_profesor', "{$grupo->curso->nombre} no tiene profesor asignado", $grupo));
        }

        foreach ($this->grupos()->where('estado', 'planeado')->where('fecha_inicio', '<', $hoy->toDateString())->with('curso:id,nombre')->get() as $grupo) {
            $pendientes->push($this->pendiente('sin_iniciar', "{$grupo->curso->nombre} debió iniciar el {$grupo->fecha_inicio->translatedFormat('j M')}; cámbialo a En curso", $grupo));
        }

        foreach ($this->gruposEnCurso() as $grupo) {
            if ($this->listaAtrasada($grupo)) {
                $mensaje = $grupo['ultima_lista'] === null
                    ? "{$grupo['curso']}: aún no se ha pasado lista"
                    : "{$grupo['curso']}: {$grupo['dias_sin_lista']} días sin pasar lista";
                $pendientes->push(['tipo' => 'sin_lista', 'mensaje' => $mensaje, 'grupo_id' => $grupo['id'], 'clave' => $grupo['clave']]);
            }

            if ($grupo['cupo'] !== null && $grupo['inscritos'] >= $grupo['cupo']) {
                $pendientes->push(['tipo' => 'lleno', 'mensaje' => "{$grupo['curso']} está lleno ({$grupo['cupo']} lugares)", 'grupo_id' => $grupo['id'], 'clave' => $grupo['clave']]);
            }
        }

        return $pendientes->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function bajasRecientes(int $limite = 5): array
    {
        return $this->inscripciones()
            ->where('estado', 'baja')
            ->with(['alumno' => fn ($query) => $query->withTrashed(), 'grupo:id,clave,curso_id', 'grupo.curso:id,nombre'])
            ->orderByDesc('fecha_baja')
            ->orderByDesc('id')
            ->limit($limite)
            ->get()
            ->map(fn (Inscripcion $inscripcion) => [
                'inscripcion_id' => $inscripcion->id,
                'nombre_completo' => $inscripcion->alumno->nombre_completo,
                'foto_url' => $inscripcion->alumno->fotoUrl(),
                'grupo_id' => $inscripcion->grupo_id,
                'grupo' => $inscripcion->grupo->clave,
                'curso' => $inscripcion->grupo->curso->nombre,
                'fecha_baja' => $inscripcion->fecha_baja?->format('Y-m-d'),
                'motivo' => $inscripcion->motivo_baja,
            ])
            ->all();
    }

    /**
     * Planned grupos, soonest first, with how full they already are.
     *
     * @return array<int, array<string, mixed>>
     */
    public function proximosGrupos(int $limite = 6): array
    {
        return $this->grupos()
            ->where('estado', 'planeado')
            ->with(['plantel:id,nombre', 'curso:id,nombre', 'profesor'])
            ->withCount(['inscripciones as inscritos' => fn ($query) => $query->where('estado', 'activo')])
            ->orderBy('fecha_inicio')
            ->limit($limite)
            ->get()
            ->map(fn (Grupo $grupo) => [
                'id' => $grupo->id,
                'clave' => $grupo->clave,
                'curso' => $grupo->curso->nombre,
                'plantel' => $grupo->plantel->nombre,
                'profesor' => $grupo->profesor?->nombre_completo,
                'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                'dias_para_inicio' => (int) now()->startOfDay()->diffInDays($grupo->fecha_inicio->copy()->startOfDay(), false),
                'inscritos' => $grupo->inscritos,
                'cupo' => $grupo->cupo,
            ])
            ->all();
    }

    /**
     * Teachers with an active grupo in scope: their load, 30-day attendance and how current their roll calls are.
     *
     * @return array<int, array<string, mixed>>
     */
    public function profesores(): array
    {
        $enCurso = $this->gruposEnCurso()->groupBy('profesor_id');

        return Profesor::query()
            ->whereHas('grupos', fn ($query) => $this->filtrarGrupos($query)->whereIn('estado', Grupo::ESTADOS_ACTIVOS))
            ->withCount(['grupos as grupos_activos' => fn ($query) => $this->filtrarGrupos($query)->whereIn('estado', Grupo::ESTADOS_ACTIVOS)])
            ->orderBy('nombre')
            ->orderBy('apellido_paterno')
            ->get()
            ->map(function (Profesor $profesor) use ($enCurso) {
                $grupos = $enCurso->get($profesor->id, collect());
                $total = (int) $grupos->sum('registros_30');
                $faltas = (int) $grupos->sum('faltas_30');
                $atrasados = $grupos->filter(fn (array $grupo) => $this->listaAtrasada($grupo))->count();

                return [
                    'id' => $profesor->id,
                    'nombre_completo' => $profesor->nombre_completo,
                    'foto_url' => $profesor->fotoUrl(),
                    'especialidad' => $profesor->especialidad,
                    'grupos_activos' => $profesor->grupos_activos,
                    'alumnos' => (int) $grupos->sum('inscritos'),
                    'asistencia' => Asistencia::porcentaje($total, $faltas),
                    'grupos_sin_lista' => $atrasados,
                ];
            })
            ->all();
    }

    /**
     * In-progress grupos that meet today (by their `dias`), earliest first, and whether today's roll call is done.
     *
     * @return array<int, array<string, mixed>>
     */
    public function clasesDeHoy(): array
    {
        $fecha = now()->toDateString();

        // Its class days, plus a make-up class held today; a class day without class stays, flagged by sin_clase_hoy.
        return $this->gruposEnCurso()
            ->filter(fn (array $grupo) => $grupo['hay_clase_hoy'] || $grupo['sin_clase_hoy'] !== null)
            ->sortBy(fn (array $grupo) => $grupo['hora_inicio'] ?? '99:99')
            ->map(fn (array $grupo) => [...$grupo, 'lista_tomada' => $grupo['ultima_lista'] === $fecha])
            ->values()
            ->all();
    }

    /**
     * Finished modules of in-progress grupos where some active alumno still has no grade, oldest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function calificacionesPendientes(): array
    {
        $diasSinClase = DiaSinClase::all();

        return $this->grupos()
            ->where('estado', 'en_curso')
            ->with([
                'curso:id,nombre,duracion_semanas',
                'curso.modulos',
                'clasesSuspendidas',
                'inscripciones' => fn ($query) => $query->where('estado', 'activo')->with('calificaciones:id,inscripcion_id,curso_modulo_id'),
            ])
            ->get()
            ->flatMap(function (Grupo $grupo) use ($diasSinClase) {
                $modulos = (new CalendarioGrupo($grupo, $diasSinClase))->modulos($grupo->curso->modulos);

                return collect($modulos)
                    ->where('estado', 'terminado')
                    ->map(fn (array $modulo) => [
                        'grupo_id' => $grupo->id,
                        'clave' => $grupo->clave,
                        'curso' => $grupo->curso->nombre,
                        'modulo_id' => $modulo['id'],
                        'orden' => $modulo['orden'],
                        'modulo' => $modulo['nombre'],
                        'fin' => $modulo['fin'],
                        'alumnos' => $grupo->inscripciones->count(),
                        'faltan' => $grupo->inscripciones
                            ->reject(fn (Inscripcion $inscripcion) => $inscripcion->calificaciones->contains('curso_modulo_id', $modulo['id']))
                            ->count(),
                    ])
                    ->filter(fn (array $pendiente) => $pendiente['faltan'] > 0);
            })
            ->sortBy('fin')
            ->values()
            ->all();
    }

    /**
     * Grupos whose roll call is overdue (see listaAtrasada()), for the profesor's to-do list.
     *
     * @return array<int, array{tipo: string, mensaje: string, grupo_id: int, clave: string}>
     */
    public function listasPendientes(): array
    {
        return collect($this->pendientes())->where('tipo', 'sin_lista')->values()->all();
    }

    /**
     * An in-progress grupo with students that started a while ago and has no recent roll call.
     *
     * @param  array<string, mixed>  $grupo  a row of gruposEnCurso()
     */
    public function listaAtrasada(array $grupo): bool
    {
        $limite = now()->startOfDay()->subDays(self::DIAS_SIN_LISTA);

        return $grupo['inscritos'] > 0
            && Carbon::parse($grupo['fecha_inicio'])->lte($limite)
            && self::sinListaReciente(
                $grupo['ultima_lista'] ? Carbon::parse($grupo['ultima_lista']) : null,
                $grupo['ultima_sin_clase'] ? Carbon::parse($grupo['ultima_sin_clase']) : null,
            );
    }

    /**
     * Whether more than DIAS_SIN_LISTA days went by since the last roll call or the last class day
     * without class (a holiday or suspended class needs no roll call), whichever is later.
     */
    public static function sinListaReciente(?Carbon $ultimaLista, ?Carbon $ultimaSinClase): bool
    {
        $referencia = collect([$ultimaLista, $ultimaSinClase])->filter()->max();

        return $referencia === null || (int) $referencia->copy()->startOfDay()->diffInDays(now()->startOfDay()) > self::DIAS_SIN_LISTA;
    }

    private function unSoloPlantel(): bool
    {
        return $this->plantelIds !== null && count($this->plantelIds) === 1;
    }

    /**
     * Grupos narrowed to the planteles in scope (soft-deleted ones are excluded by the model).
     */
    private function grupos(): Builder
    {
        return $this->filtrarGrupos(Grupo::query());
    }

    private function filtrarGrupos(Builder $query): Builder
    {
        return $query
            ->when($this->plantelIds !== null, fn ($query) => $query->whereIn('plantel_id', $this->plantelIds))
            ->when($this->profesorId !== null, fn ($query) => $query->where('profesor_id', $this->profesorId));
    }

    /**
     * Enrollments whose grupo belongs to the plantel.
     */
    private function inscripciones(): Builder
    {
        return Inscripcion::query()->whereHas('grupo', fn ($query) => $this->filtrarGrupos($query));
    }

    /**
     * Active enrollments joined to their (live) grupo and alumno, for SQL grouping.
     */
    private function inscripcionesActivasQuery(): QueryBuilder
    {
        return DB::table('inscripciones')
            ->join('grupos', 'grupos.id', '=', 'inscripciones.grupo_id')
            ->join('alumnos', 'alumnos.id', '=', 'inscripciones.alumno_id')
            ->where('inscripciones.estado', 'activo')
            ->whereNull('grupos.deleted_at')
            ->whereNull('alumnos.deleted_at')
            ->when($this->plantelIds !== null, fn ($query) => $query->whereIn('grupos.plantel_id', $this->plantelIds))
            ->when($this->profesorId !== null, fn ($query) => $query->where('grupos.profesor_id', $this->profesorId));
    }

    /**
     * Attendance records joined to their grupo, for SQL grouping.
     */
    private function asistenciasQuery(): QueryBuilder
    {
        return DB::table('asistencias')
            ->join('inscripciones', 'inscripciones.id', '=', 'asistencias.inscripcion_id')
            ->join('grupos', 'grupos.id', '=', 'inscripciones.grupo_id')
            ->whereNull('grupos.deleted_at')
            ->when($this->plantelIds !== null, fn ($query) => $query->whereIn('grupos.plantel_id', $this->plantelIds))
            ->when($this->profesorId !== null, fn ($query) => $query->where('grupos.profesor_id', $this->profesorId));
    }

    /**
     * @return array{total: int, faltas: int}
     */
    private function totalesAsistencia(Carbon $desde, Carbon $hasta): array
    {
        $fila = $this->asistenciasQuery()
            ->whereBetween(DB::raw('date(asistencias.fecha)'), [$desde->toDateString(), $hasta->toDateString()])
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when asistencias.estado = 'falta' then 1 else 0 end) as faltas")
            ->first();

        return ['total' => (int) ($fila->total ?? 0), 'faltas' => (int) ($fila->faltas ?? 0)];
    }

    private function bajasEntre(Carbon $desde, Carbon $hasta): int
    {
        return $this->inscripciones()
            ->where('estado', 'baja')
            // date() so the upper bound includes its whole day on drivers that store a time part (SQLite).
            ->whereBetween(DB::raw('date(fecha_baja)'), [$desde->toDateString(), $hasta->toDateString()])
            ->count();
    }

    /**
     * Count rows per "Y-m" of the given date column.
     *
     * @return Collection<string, int>
     */
    private function porMes(Builder $query, string $columna): Collection
    {
        return $query->selectRaw("date({$columna}) as dia, count(*) as total")
            ->groupBy('dia')
            ->get()
            ->groupBy(fn ($fila) => Carbon::parse($fila->dia)->format('Y-m'))
            ->map(fn ($filas) => (int) $filas->sum('total'));
    }

    /**
     * @return array{tipo: string, mensaje: string, grupo_id: int, clave: string}
     */
    private function pendiente(string $tipo, string $mensaje, Grupo $grupo): array
    {
        return ['tipo' => $tipo, 'mensaje' => $mensaje, 'grupo_id' => $grupo->id, 'clave' => $grupo->clave];
    }
}
