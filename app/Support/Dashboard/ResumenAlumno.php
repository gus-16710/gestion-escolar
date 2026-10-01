<?php

namespace App\Support\Dashboard;

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\DiaSinClase;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Support\CalendarioGrupo;
use App\Support\Calificaciones\Boleta;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * An alumno's own view: their current courses with attendance and progress, today's classes,
 * recent attendance records and past courses. Alumnos can't open grupos or roll calls, so
 * everything they need is gathered here.
 */
class ResumenAlumno
{
    /** @var Collection<int, Inscripcion>|null */
    private ?Collection $inscripciones = null;

    /** @var array<int, CalendarioGrupo> by grupo id */
    private array $calendarios = [];

    private ?Collection $diasSinClase = null;

    public function __construct(private readonly Alumno $alumno) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        $cursos = $this->cursos();

        return [
            'alumno' => [
                'nombre_completo' => $this->alumno->nombre_completo,
                'matricula' => $this->alumno->matricula,
                'foto_url' => $this->alumno->fotoUrl(),
            ],
            'kpis' => $this->kpis($cursos),
            'cursos' => $cursos->values()->all(),
            'clasesDeHoy' => $this->clasesDeHoy($cursos),
            'historial' => $this->historial(),
            'anteriores' => $this->anteriores(),
        ];
    }

    /**
     * Active enrollments in planned or in-progress grupos, in-progress first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function cursos(): Collection
    {
        return $this->inscripciones()
            ->filter(fn (Inscripcion $inscripcion) => $inscripcion->estado === 'activo'
                && in_array($inscripcion->grupo->estado, Grupo::ESTADOS_ACTIVOS, true))
            ->sortBy(fn (Inscripcion $inscripcion) => [$inscripcion->grupo->estado === 'en_curso' ? 0 : 1, $inscripcion->grupo->fecha_inicio])
            ->map(function (Inscripcion $inscripcion) {
                $grupo = $inscripcion->grupo;

                return [
                    'inscripcion_id' => $inscripcion->id,
                    'clave' => $grupo->clave,
                    'curso' => $grupo->curso->nombre,
                    'plantel' => $grupo->plantel->nombre,
                    'profesor' => $grupo->profesor?->nombre_completo,
                    'profesor_foto_url' => $grupo->profesor?->fotoUrl(),
                    'turno' => $grupo->turno,
                    'dias' => $grupo->dias,
                    'hora_inicio' => $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5) : null,
                    'hora_fin' => $grupo->hora_fin ? substr($grupo->hora_fin, 0, 5) : null,
                    'estado_grupo' => $grupo->estado,
                    'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                    'fecha_fin' => $this->fechaFin($grupo)?->format('Y-m-d'),
                    'avance' => $this->avance($grupo),
                    'asistencia' => $this->asistencia($inscripcion),
                    'calificaciones' => $this->calificaciones($inscripcion),
                ];
            })
            ->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $cursos
     * @return array<string, int|null>
     */
    private function kpis(Collection $cursos): array
    {
        $enCurso = $cursos->where('estado_grupo', 'en_curso');
        $total = (int) $enCurso->sum('asistencia.total');
        $faltas = (int) $enCurso->sum('asistencia.faltas');

        return [
            'cursos_en_curso' => $enCurso->count(),
            'cursos_por_iniciar' => $cursos->where('estado_grupo', 'planeado')->count(),
            'asistencia' => Asistencia::porcentaje($total, $faltas),
            'registros' => $total,
            'faltas' => $faltas,
            'retardos' => (int) $enCurso->sum('asistencia.retardos'),
            'justificadas' => (int) $enCurso->sum('asistencia.justificadas'),
        ];
    }

    /**
     * In-progress courses that meet today, earliest first, with today's attendance if already taken.
     *
     * @param  Collection<int, array<string, mixed>>  $cursos
     * @return array<int, array<string, mixed>>
     */
    private function clasesDeHoy(Collection $cursos): array
    {
        $dia = Grupo::DIAS[now()->dayOfWeekIso - 1];

        $hoy = $cursos
            ->where('estado_grupo', 'en_curso')
            ->filter(fn (array $curso) => in_array($dia, explode(',', (string) $curso['dias']), true));

        $asistenciasDeHoy = Asistencia::whereIn('inscripcion_id', $hoy->pluck('inscripcion_id'))
            ->whereDate('fecha', now()->toDateString())
            ->pluck('estado', 'inscripcion_id');

        return $hoy
            ->sortBy(fn (array $curso) => $curso['hora_inicio'] ?? '99:99')
            ->map(fn (array $curso) => [
                'inscripcion_id' => $curso['inscripcion_id'],
                'curso' => $curso['curso'],
                'plantel' => $curso['plantel'],
                'profesor' => $curso['profesor'],
                'hora_inicio' => $curso['hora_inicio'],
                'hora_fin' => $curso['hora_fin'],
                'asistencia_hoy' => $asistenciasDeHoy->get($curso['inscripcion_id']),
            ])
            ->values()
            ->all();
    }

    /**
     * The latest attendance records across all of the alumno's enrollments.
     *
     * @return array<int, array<string, mixed>>
     */
    public function historial(int $limite = 10): array
    {
        return Asistencia::query()
            ->whereIn('inscripcion_id', $this->inscripciones()->pluck('id'))
            ->with('inscripcion.grupo.curso:id,nombre')
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->limit($limite)
            ->get()
            ->map(fn (Asistencia $asistencia) => [
                'id' => $asistencia->id,
                'fecha' => $asistencia->fecha->format('Y-m-d'),
                'curso' => $asistencia->inscripcion->grupo->curso->nombre,
                'estado' => $asistencia->estado,
                'observaciones' => $asistencia->observaciones,
            ])
            ->all();
    }

    /**
     * Courses already finished or left: dropped or graduated enrollments, or grupos that ended.
     *
     * @return array<int, array<string, mixed>>
     */
    public function anteriores(): array
    {
        return $this->inscripciones()
            ->reject(fn (Inscripcion $inscripcion) => $inscripcion->estado === 'activo'
                && in_array($inscripcion->grupo->estado, Grupo::ESTADOS_ACTIVOS, true))
            ->sortByDesc(fn (Inscripcion $inscripcion) => $inscripcion->grupo->fecha_inicio)
            ->map(function (Inscripcion $inscripcion) {
                $boleta = Boleta::de($inscripcion->grupo->curso->modulos, $inscripcion->calificaciones);

                return [
                    'inscripcion_id' => $inscripcion->id,
                    'curso' => $inscripcion->grupo->curso->nombre,
                    'clave' => $inscripcion->grupo->clave,
                    'plantel' => $inscripcion->grupo->plantel->nombre,
                    'resultado' => match (true) {
                        $inscripcion->estado === 'baja' => 'baja',
                        $inscripcion->estado === 'egresado' => 'egresado',
                        $inscripcion->estado === 'no_acreditado' => 'no_acreditado',
                        $inscripcion->grupo->estado === 'concluido' => 'concluido',
                        default => 'cancelado',
                    },
                    'fecha' => ($inscripcion->fecha_baja ?? $inscripcion->fecha_cierre ?? $this->fechaFin($inscripcion->grupo))?->format('Y-m-d'),
                    'asistencia' => $this->asistencia($inscripcion)['porcentaje'],
                    // The final average, or the partial one of the modules graded before leaving.
                    // The average frozen at the close, else the final one, else the partial one of the modules graded before leaving.
                    'promedio' => $inscripcion->promedio_final ?? $boleta['promedio_final'] ?? $boleta['promedio_parcial'],
                    'promedio_completo' => $inscripcion->promedio_final !== null || $boleta['promedio_final'] !== null,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Every enrollment of the alumno in a live grupo, loaded once with what the dashboard shows.
     *
     * @return Collection<int, Inscripcion>
     */
    private function inscripciones(): Collection
    {
        return $this->inscripciones ??= $this->alumno->inscripciones()
            ->whereHas('grupo')
            ->with(['grupo.curso:id,nombre,duracion_semanas', 'grupo.curso.modulos', 'grupo.plantel:id,nombre', 'grupo.profesor', 'grupo.clasesSuspendidas', 'calificaciones'])
            ->withCount([
                'asistencias as total_registros',
                'asistencias as faltas' => fn ($query) => $query->where('estado', 'falta'),
                'asistencias as retardos' => fn ($query) => $query->where('estado', 'retardo'),
                'asistencias as justificadas' => fn ($query) => $query->where('estado', 'justificada'),
            ])
            ->get();
    }

    /**
     * @return array{porcentaje: int|null, total: int, presentes: int, faltas: int, retardos: int, justificadas: int, en_riesgo: bool}
     */
    private function asistencia(Inscripcion $inscripcion): array
    {
        $total = (int) $inscripcion->total_registros;
        $faltas = (int) $inscripcion->faltas;
        $porcentaje = Asistencia::porcentaje($total, $faltas);

        return [
            'porcentaje' => $porcentaje,
            'total' => $total,
            'presentes' => $total - $faltas - (int) $inscripcion->retardos - (int) $inscripcion->justificadas,
            'faltas' => $faltas,
            'retardos' => (int) $inscripcion->retardos,
            'justificadas' => (int) $inscripcion->justificadas,
            'en_riesgo' => $total >= ResumenEscolar::MIN_REGISTROS_RIESGO && $porcentaje < ResumenEscolar::UMBRAL_RIESGO,
        ];
    }

    /**
     * The alumno's report card in the curso: each module of the study plan with where the grupo stands
     * in it and the alumno's grade, plus the partial and final averages (see Boleta).
     *
     * @return array<string, mixed>
     */
    private function calificaciones(Inscripcion $inscripcion): array
    {
        $modulos = $inscripcion->grupo->curso->modulos;
        $boleta = Boleta::de($modulos, $inscripcion->calificaciones);
        $calendario = $this->calendario($inscripcion->grupo)->modulos($modulos);

        return [
            ...$boleta,
            'modulos' => collect($boleta['modulos'])->map(fn (array $fila, int $indice) => [
                ...$fila,
                'orden' => $calendario[$indice]['orden'],
                'nombre' => $calendario[$indice]['nombre'],
                'estado' => $calendario[$indice]['estado'],
            ])->all(),
        ];
    }

    private function calendario(Grupo $grupo): CalendarioGrupo
    {
        $this->diasSinClase ??= DiaSinClase::all();

        return $this->calendarios[$grupo->id] ??= new CalendarioGrupo($grupo, $this->diasSinClase);
    }

    /**
     * The grupo's end: fecha_fin (or start + the curso's length), pushed by the classes lost (see CalendarioGrupo).
     */
    private function fechaFin(Grupo $grupo): ?CarbonInterface
    {
        return $this->calendario($grupo)->finAjustado();
    }

    /**
     * Course progress by week: "semana 5 de 24", or days left until it starts.
     *
     * @return array{semana: int, semanas: int, porcentaje: int}|array{dias_para_inicio: int}|null
     */
    private function avance(Grupo $grupo): ?array
    {
        $hoy = now()->startOfDay();
        $inicio = Carbon::parse($grupo->fecha_inicio)->startOfDay();

        if ($inicio->gt($hoy)) {
            return ['dias_para_inicio' => (int) $hoy->diffInDays($inicio)];
        }

        $fin = $this->fechaFin($grupo)?->copy()->startOfDay();

        if ($fin === null || $fin->lte($inicio)) {
            return null;
        }

        $semanas = max(1, (int) ceil($inicio->diffInDays($fin) / 7));
        $semana = min($semanas, (int) floor($inicio->diffInDays($hoy) / 7) + 1);

        return [
            'semana' => $semana,
            'semanas' => $semanas,
            'porcentaje' => (int) min(100, round(100 * $inicio->diffInDays($hoy) / $inicio->diffInDays($fin))),
        ];
    }
}
