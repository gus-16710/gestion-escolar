<?php

namespace App\Support\Reportes;

use App\Models\Asistencia;
use App\Models\Director;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Support\CalendarioGrupo;
use App\Support\Calificaciones\Boleta;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Gathers what each printed report shows, as plain arrays: the Blade views render them and the issued
 * documents (boleta, constancia) keep them as their copy in `documentos_emitidos.datos`.
 */
class DatosReporte
{
    public const TURNOS = ['matutino' => 'Matutino', 'vespertino' => 'Vespertino', 'sabatino' => 'Sabatino', 'dominical' => 'Dominical'];

    public const ESTADOS_INSCRIPCION = ['activo' => 'Inscrito', 'baja' => 'Baja', 'egresado' => 'Egresado', 'no_acreditado' => 'No acreditado'];

    /**
     * The plantel block of every report's header.
     *
     * @return array{nombre: string, direccion: string, telefono: ?string, email: ?string, localidad: ?string, estado: ?string}
     */
    public static function plantel(Plantel $plantel): array
    {
        return [
            'nombre' => $plantel->nombre,
            'direccion' => $plantel->direccion_completa,
            'telefono' => $plantel->telefono,
            'email' => $plantel->email,
            'localidad' => $plantel->localidad,
            'estado' => $plantel->estado,
        ];
    }

    /**
     * Who can sign for a plantel: the active directors who run it, by name.
     *
     * @return array<int, string>
     */
    public static function firmantes(int $plantelId): array
    {
        return Director::where('activo', true)
            ->whereHas('planteles', fn ($query) => $query->whereKey($plantelId))
            ->get()
            ->map(fn (Director $director) => $director->nombre_completo)
            ->sort()
            ->values()
            ->all();
    }

    /**
     * An alumno's report card in one grupo: grades per module, averages, attendance and how the course stands.
     *
     * @return array<string, mixed>
     */
    public static function boleta(Inscripcion $inscripcion): array
    {
        $inscripcion->loadMissing(['alumno' => fn ($query) => $query->withTrashed(), 'grupo.curso.modulos', 'grupo.plantel', 'grupo.profesor', 'grupo.clasesSuspendidas', 'calificaciones']);
        $grupo = $inscripcion->grupo;
        $modulos = $grupo->curso->modulos;
        $boleta = Boleta::de($modulos, $inscripcion->calificaciones);
        $porModulo = $inscripcion->calificaciones->keyBy('curso_modulo_id');
        $concluida = in_array($inscripcion->estado, ['egresado', 'no_acreditado'], true);

        return [
            ...self::encabezadoAlumno($inscripcion),
            'modulos' => $modulos->values()->map(function ($modulo, int $indice) use ($boleta, $porModulo) {
                $calificacion = $porModulo->get($modulo->id);

                return [
                    'orden' => $modulo->orden,
                    'nombre' => $modulo->nombre,
                    'semanas' => $modulo->duracion_semanas,
                    'calificacion' => $boleta['modulos'][$indice]['calificacion'],
                    'recuperacion' => $boleta['modulos'][$indice]['recuperacion'],
                    'final' => $boleta['modulos'][$indice]['final'],
                    'aprobada' => $boleta['modulos'][$indice]['aprobada'],
                    'fecha' => ($calificacion?->recuperacion !== null ? $calificacion?->fecha_recuperacion : $calificacion?->fecha_evaluacion)?->format('Y-m-d'),
                ];
            })->all(),
            // A closed enrollment keeps the average frozen at closing; otherwise the live one.
            'promedio_final' => $concluida ? $inscripcion->promedio_final : $boleta['promedio_final'],
            'promedio_parcial' => $boleta['promedio_parcial'],
            'calificados' => $boleta['calificados'],
            'total_modulos' => $boleta['total'],
            'situacion' => $boleta['situacion'],
            'parcial' => ! $concluida,
            'asistencia' => self::asistenciaDe($inscripcion),
        ];
    }

    /**
     * What a constancia states: who finished which course, when, and with what final average.
     *
     * @return array<string, mixed>
     */
    public static function constancia(Inscripcion $inscripcion): array
    {
        $inscripcion->loadMissing(['alumno' => fn ($query) => $query->withTrashed(), 'grupo.curso', 'grupo.plantel', 'grupo.profesor', 'grupo.clasesSuspendidas']);

        return [
            ...self::encabezadoAlumno($inscripcion),
            'duracion_semanas' => $inscripcion->grupo->curso->duracion_semanas,
            'promedio_final' => $inscripcion->promedio_final,
        ];
    }

    /**
     * The grupo's grade sheet for the archive: every alumno × module, average, attendance and result.
     *
     * @return array<string, mixed>
     */
    public static function concentrado(Grupo $grupo): array
    {
        $grupo->loadMissing(['curso.modulos', 'plantel', 'profesor', 'clasesSuspendidas']);
        $modulos = $grupo->curso->modulos;

        $inscripciones = self::inscripcionesOrdenadas($grupo, ['calificaciones'])
            ->map(function (Inscripcion $inscripcion) use ($modulos) {
                $boleta = Boleta::de($modulos, $inscripcion->calificaciones);
                $concluida = in_array($inscripcion->estado, ['egresado', 'no_acreditado'], true);

                return [
                    'matricula' => $inscripcion->alumno->matricula,
                    'nombre' => $inscripcion->alumno->nombre_completo,
                    'estado' => $inscripcion->estado,
                    'estado_etiqueta' => self::ESTADOS_INSCRIPCION[$inscripcion->estado] ?? $inscripcion->estado,
                    'calificaciones' => collect($boleta['modulos'])->map(fn (array $fila) => [
                        'final' => $fila['final'],
                        'recuperacion' => $fila['recuperacion'] !== null,
                        'original' => $fila['calificacion'],
                    ])->all(),
                    'promedio' => $concluida ? $inscripcion->promedio_final : ($boleta['promedio_final'] ?? $boleta['promedio_parcial']),
                    'promedio_completo' => $concluida || $boleta['promedio_final'] !== null,
                    'asistencia' => self::asistenciaDe($inscripcion)['porcentaje'],
                ];
            });

        $activos = $inscripciones->where('estado', '!=', 'baja');
        $promedios = $activos->pluck('promedio')->filter(fn ($promedio) => $promedio !== null);

        return [
            ...self::encabezadoGrupo($grupo),
            'modulos' => $modulos->map(fn ($modulo) => ['orden' => $modulo->orden, 'nombre' => $modulo->nombre])->values()->all(),
            'alumnos' => $activos->values()->all(),
            'bajas' => $inscripciones->where('estado', 'baja')->values()->all(),
            'promedio_grupo' => $promedios->isEmpty() ? null : round($promedios->avg(), 1),
            // Partial while some alumno still has modules to grade.
            'promedio_grupo_parcial' => $activos->contains('promedio_completo', false),
        ];
    }

    /**
     * The roll-call sheet of one month: the grupo's class days in it (days without class marked) and each
     * alumno's record per day, or blank cells to take the roll by hand.
     *
     * @return array<string, mixed>
     */
    public static function asistencia(Grupo $grupo, CarbonInterface $mes, bool $enBlanco): array
    {
        $grupo->loadMissing(['curso', 'plantel', 'profesor', 'clasesSuspendidas']);
        $calendario = new CalendarioGrupo($grupo);
        $desde = Carbon::parse($mes)->startOfMonth();
        $hasta = $desde->copy()->endOfMonth();

        $inscripciones = self::inscripcionesOrdenadas($grupo, [
            'asistencias' => fn ($query) => $query->whereBetween('fecha', [$desde->toDateString(), $hasta->copy()->endOfDay()->toDateTimeString()]),
        ])
            // Drop-outs only while they were still enrolled that month.
            ->reject(fn (Inscripcion $inscripcion) => $inscripcion->estado === 'baja' && $inscripcion->fecha_baja?->lt($desde));

        $conRegistro = $inscripciones->flatMap(fn (Inscripcion $inscripcion) => $inscripcion->asistencias->map(fn (Asistencia $asistencia) => $asistencia->fecha->toDateString()));

        $fechas = [];

        for ($fecha = $desde->copy(); $fecha->lte($hasta); $fecha->addDay()) {
            $dia = $fecha->toDateString();
            $sinClase = $calendario->sinClaseEn($fecha);
            $dentro = $fecha->gte($grupo->fecha_inicio);

            if ($dentro && ($calendario->hayClase($fecha) || ($sinClase && $calendario->esDiaDeClase($fecha)) || $conRegistro->contains($dia))) {
                $fechas[] = [
                    'fecha' => $dia,
                    'sin_clase' => $sinClase && ! $calendario->hayClase($fecha) && ! $conRegistro->contains($dia)
                        ? ($sinClase['tipo'] === 'festivo' ? 'Sin clase' : 'Suspendida')
                        : null,
                    'reposicion' => $calendario->clasesRepuestasEn($fecha) !== [],
                ];
            }
        }

        $letras = ['presente' => 'P', 'retardo' => 'R', 'falta' => 'F', 'justificada' => 'J'];

        return [
            ...self::encabezadoGrupo($grupo, $calendario),
            'mes' => $desde->format('Y-m'),
            'mes_etiqueta' => $desde->translatedFormat('F \d\e Y'),
            'en_blanco' => $enBlanco,
            'fechas' => $fechas,
            'alumnos' => $inscripciones->map(function (Inscripcion $inscripcion) use ($fechas, $letras, $enBlanco) {
                $porFecha = $inscripcion->asistencias->keyBy(fn (Asistencia $asistencia) => $asistencia->fecha->toDateString());
                $conteo = $inscripcion->asistencias->countBy('estado');

                return [
                    'matricula' => $inscripcion->alumno->matricula,
                    'nombre' => $inscripcion->alumno->nombre_completo,
                    'baja' => $inscripcion->estado === 'baja' ? $inscripcion->fecha_baja?->format('Y-m-d') : null,
                    'dias' => collect($fechas)->map(function (array $fecha) use ($porFecha, $letras, $inscripcion, $enBlanco) {
                        // Not enrolled yet, or already dropped, that day.
                        if ($inscripcion->fecha_inscripcion?->gt($fecha['fecha']) || ($inscripcion->estado === 'baja' && $inscripcion->fecha_baja?->lt($fecha['fecha']))) {
                            return '–';
                        }

                        return $enBlanco ? '' : ($letras[$porFecha->get($fecha['fecha'])?->estado] ?? '');
                    })->all(),
                    'totales' => $enBlanco ? null : [
                        'P' => $conteo->get('presente', 0),
                        'R' => $conteo->get('retardo', 0),
                        'F' => $conteo->get('falta', 0),
                        'J' => $conteo->get('justificada', 0),
                        'porcentaje' => Asistencia::porcentaje($inscripcion->asistencias->count(), $conteo->get('falta', 0)),
                    ],
                ];
            })->values()->all(),
        ];
    }

    /**
     * The months a grupo's roll-call sheet can be printed for: from its start to its adjusted end.
     *
     * @return array<int, array{valor: string, etiqueta: string}>
     */
    public static function meses(Grupo $grupo, ?CalendarioGrupo $calendario = null): array
    {
        $calendario ??= new CalendarioGrupo($grupo);
        $fin = $calendario->finAjustado() ?? today();
        $meses = [];

        for ($mes = $grupo->fecha_inicio->copy()->startOfMonth(); $mes->lte($fin) && count($meses) < 36; $mes->addMonth()) {
            $meses[] = ['valor' => $mes->format('Y-m'), 'etiqueta' => ucfirst($mes->translatedFormat('F Y'))];
        }

        return $meses;
    }

    /**
     * The month offered first: the current one while the grupo runs, otherwise its last month so far (or its first).
     *
     * @param  array<int, array{valor: string, etiqueta: string}>  $meses
     */
    public static function mesSugerido(array $meses): ?string
    {
        $actual = today()->format('Y-m');
        $hastaHoy = collect($meses)->filter(fn (array $mes) => $mes['valor'] <= $actual);

        return ($hastaHoy->last() ?? $meses[0] ?? null)['valor'] ?? null;
    }

    /**
     * The grupo and alumno block shared by the boleta and the constancia.
     *
     * @return array<string, mixed>
     */
    private static function encabezadoAlumno(Inscripcion $inscripcion): array
    {
        $grupo = $inscripcion->grupo;

        return [
            'alumno' => [
                'nombre' => $inscripcion->alumno->nombre_completo,
                'matricula' => $inscripcion->alumno->matricula,
            ],
            ...self::encabezadoGrupo($grupo),
            'estado' => $inscripcion->estado,
            'estado_etiqueta' => self::ESTADOS_INSCRIPCION[$inscripcion->estado] ?? $inscripcion->estado,
            'fecha_cierre' => $inscripcion->fecha_cierre?->format('Y-m-d'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function encabezadoGrupo(Grupo $grupo, ?CalendarioGrupo $calendario = null): array
    {
        $calendario ??= new CalendarioGrupo($grupo);
        $horas = $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5).($grupo->hora_fin ? '–'.substr($grupo->hora_fin, 0, 5) : '') : null;

        return [
            'plantel' => self::plantel($grupo->plantel),
            'curso' => ['nombre' => $grupo->curso->nombre, 'clave' => $grupo->curso->clave],
            'grupo' => [
                'clave' => $grupo->clave,
                'estado' => $grupo->estado,
                'horario' => collect([self::TURNOS[$grupo->turno] ?? $grupo->turno, $grupo->dias ? str_replace(',', ', ', $grupo->dias) : null, $horas])->filter()->join(' · '),
                'inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                'fin' => ($grupo->concluido_en ?? $calendario->finAjustado())?->format('Y-m-d'),
            ],
            'profesor' => $grupo->profesor?->nombre_completo,
        ];
    }

    /**
     * The grupo's enrollments with their alumno, current ones first and then by surname.
     *
     * @param  array<int|string, mixed>  $con
     * @return Collection<int, Inscripcion>
     */
    private static function inscripcionesOrdenadas(Grupo $grupo, array $con): Collection
    {
        return $grupo->inscripciones()
            ->with(['alumno' => fn ($query) => $query->withTrashed(), ...$con])
            ->get()
            ->sortBy(fn (Inscripcion $inscripcion) => ($inscripcion->estado === 'baja' ? '1' : '0').$inscripcion->alumno->apellido_paterno.' '.$inscripcion->alumno->apellido_materno.' '.$inscripcion->alumno->nombre)
            ->values();
    }

    /**
     * An enrollment's attendance totals and percentage.
     *
     * @return array{registros: int, presentes: int, retardos: int, faltas: int, justificadas: int, porcentaje: ?int}
     */
    private static function asistenciaDe(Inscripcion $inscripcion): array
    {
        $conteo = $inscripcion->asistencias()->selectRaw('estado, count(*) as total')->groupBy('estado')->pluck('total', 'estado');
        $total = (int) $conteo->sum();
        $faltas = (int) $conteo->get('falta', 0);

        return [
            'registros' => $total,
            'presentes' => (int) $conteo->get('presente', 0),
            'retardos' => (int) $conteo->get('retardo', 0),
            'faltas' => $faltas,
            'justificadas' => (int) $conteo->get('justificada', 0),
            'porcentaje' => Asistencia::porcentaje($total, $faltas),
        ];
    }
}
