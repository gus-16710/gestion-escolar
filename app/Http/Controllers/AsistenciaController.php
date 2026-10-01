<?php

namespace App\Http\Controllers;

use App\Models\Asistencia;
use App\Models\ClaseSuspendida;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Support\CalendarioGrupo;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AsistenciaController extends Controller
{
    use AuthorizesRequests;

    public const ESTADOS = ['presente', 'falta', 'retardo', 'justificada'];

    /**
     * Show the roll call of the given grupo for one date, plus its attendance history.
     */
    public function edit(Request $request, Grupo $grupo): Response
    {
        $this->authorize('viewAttendance', $grupo);

        $calendario = new CalendarioGrupo($grupo);
        $fecha = $this->fechaSolicitada($request, $grupo, $calendario);

        // Queried with whereDate so the lookup works whether the driver stores dates with or without a time part.
        $asistenciasDelDia = Asistencia::whereIn('inscripcion_id', $grupo->inscripciones()->select('id'))
            ->whereDate('fecha', $fecha)
            ->get()
            ->keyBy('inscripcion_id');

        // Active alumnos, plus anyone dropped later who already has a record on this date.
        $inscripciones = $grupo->inscripciones()
            ->with(['alumno' => fn ($query) => $query->withTrashed()])
            ->withCount([
                'asistencias as total_registros',
                'asistencias as faltas' => fn ($query) => $query->where('estado', 'falta'),
                'asistencias as retardos' => fn ($query) => $query->where('estado', 'retardo'),
            ])
            ->get()
            ->filter(fn (Inscripcion $inscripcion) => $inscripcion->estado === 'activo' || $asistenciasDelDia->has($inscripcion->id))
            ->sortBy(fn (Inscripcion $inscripcion) => $inscripcion->alumno->apellido_paterno.' '.$inscripcion->alumno->nombre)
            ->values();

        return Inertia::render('asistencias/pase-lista', [
            'grupo' => [
                'id' => $grupo->id,
                'clave' => $grupo->clave,
                'curso' => $grupo->curso->nombre,
                'estado' => $grupo->estado,
                'dias' => $grupo->dias ? explode(',', $grupo->dias) : [],
                'horario' => $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5).($grupo->hora_fin ? '–'.substr($grupo->hora_fin, 0, 5) : '') : null,
                'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                // Pushed by the classes lost, so the last classes can still be taken.
                'fecha_fin' => $grupo->fecha_fin ? $calendario->finAjustado()?->format('Y-m-d') : null,
            ],
            'fecha' => $fecha->format('Y-m-d'),
            'hoy' => now()->format('Y-m-d'),
            'alumnos' => $inscripciones->map(function (Inscripcion $inscripcion) use ($asistenciasDelDia) {
                $asistencia = $asistenciasDelDia->get($inscripcion->id);

                return [
                    'inscripcion_id' => $inscripcion->id,
                    'matricula' => $inscripcion->alumno->matricula,
                    'nombre_completo' => $inscripcion->alumno->nombre_completo,
                    'foto_url' => $inscripcion->alumno->fotoUrl(),
                    'inscripcion_activa' => $inscripcion->estado === 'activo',
                    'estado' => $asistencia?->estado,
                    'observaciones' => $asistencia?->observaciones,
                    'resumen' => [
                        'total' => $inscripcion->total_registros,
                        'faltas' => $inscripcion->faltas,
                        'retardos' => $inscripcion->retardos,
                        'porcentaje' => Asistencia::porcentaje($inscripcion->total_registros, $inscripcion->faltas),
                    ],
                ];
            }),
            'historial' => $this->historial($grupo),
            // Why there's no class that day (holiday or suspension), and the classes made up that day.
            'sinClase' => $calendario->sinClaseEn($fecha),
            'reposicionDe' => $calendario->clasesRepuestasEn($fecha),
            'clasesSinImpartir' => $calendario->clasesSinImpartir(),
            'motivosSuspension' => ClaseSuspendida::MOTIVOS,
            'canTake' => $request->user()->can('takeAttendance', $grupo),
            'canSuspend' => $request->user()->can('suspendClass', $grupo),
        ]);
    }

    /**
     * Save the roll call of the given grupo for one date (creating or correcting records).
     */
    public function update(Request $request, Grupo $grupo): RedirectResponse
    {
        $this->authorize('takeAttendance', $grupo);

        $validated = $request->validate([
            'fecha' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$grupo->fecha_inicio->format('Y-m-d')],
            'registros' => ['required', 'array', 'min:1'],
            'registros.*.inscripcion_id' => ['required', 'integer', 'distinct', Rule::in($grupo->inscripciones()->pluck('id'))],
            'registros.*.estado' => ['required', Rule::in(self::ESTADOS)],
            'registros.*.observaciones' => ['nullable', 'string', 'max:255'],
        ], [
            'fecha.after_or_equal' => 'La fecha no puede ser anterior al inicio del grupo.',
            'fecha.before_or_equal' => 'No se puede pasar lista de una fecha futura.',
            'registros.*.estado.required' => 'Marca la asistencia de todos los alumnos.',
        ]);

        DB::transaction(function () use ($request, $validated) {
            foreach ($validated['registros'] as $registro) {
                $asistencia = Asistencia::where('inscripcion_id', $registro['inscripcion_id'])
                    ->whereDate('fecha', $validated['fecha'])
                    ->first() ?? new Asistencia(['inscripcion_id' => $registro['inscripcion_id'], 'fecha' => $validated['fecha']]);

                $asistencia->fill([
                    'estado' => $registro['estado'],
                    'observaciones' => $registro['observaciones'] ?? null,
                    'registrado_por' => $request->user()->id,
                ])->save();
            }
        });

        return to_route('asistencias.edit', ['grupo' => $grupo, 'fecha' => $validated['fecha']]);
    }

    /**
     * The requested date, defaulting to today clamped to the grupo's period.
     */
    private function fechaSolicitada(Request $request, Grupo $grupo, CalendarioGrupo $calendario): Carbon
    {
        $fecha = $request->filled('fecha')
            ? rescue(fn () => Carbon::parse($request->string('fecha')->toString()), now(), report: false)->startOfDay()
            : $this->ultimaClase($grupo, $calendario);

        // The end moves with the classes lost, so the roll call reaches the classes that make them up.
        $fin = $grupo->fecha_fin ? $calendario->finAjustado() : null;

        if ($fin && $fecha->gt($fin)) {
            $fecha = $fin->copy();
        }

        if ($fecha->lt($grupo->fecha_inicio)) {
            $fecha = $grupo->fecha_inicio->copy();
        }

        return $fecha->min(now()->startOfDay());
    }

    /**
     * Today if the grupo meets today, otherwise its most recent day with class, skipping holidays and
     * suspended classes and counting make-up dates (so the roll call never opens on a day without class).
     * Grupos without days fall back to today.
     */
    private function ultimaClase(Grupo $grupo, CalendarioGrupo $calendario): Carbon
    {
        return $grupo->dias ? ($calendario->ultimaClaseHasta(now()) ?? now()->startOfDay()) : now()->startOfDay();
    }

    /**
     * Dates with attendance recorded for the grupo, newest first, with per-state counts.
     *
     * @return array<int, array<string, mixed>>
     */
    private function historial(Grupo $grupo): array
    {
        return Asistencia::query()
            ->whereIn('inscripcion_id', $grupo->inscripciones()->select('id'))
            ->selectRaw('date(fecha) as dia')
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when estado = 'presente' then 1 else 0 end) as presentes")
            ->selectRaw("sum(case when estado = 'falta' then 1 else 0 end) as faltas")
            ->selectRaw("sum(case when estado = 'retardo' then 1 else 0 end) as retardos")
            ->groupBy('dia')
            ->orderByDesc('dia')
            ->get()
            ->map(fn ($fila) => [
                'fecha' => Carbon::parse($fila->dia)->format('Y-m-d'),
                'total' => (int) $fila->total,
                'presentes' => (int) $fila->presentes,
                'faltas' => (int) $fila->faltas,
                'retardos' => (int) $fila->retardos,
            ])
            ->all();
    }
}
