<?php

namespace App\Http\Controllers;

use App\Models\ClaseSuspendida;
use App\Models\Grupo;
use App\Support\CalendarioGrupo;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Classes of a grupo that were not given: recorded (or corrected) per date, optionally with the date
 * they were made up on, and undone by deleting them. The grupo's study plan follows from them.
 */
class ClaseSuspendidaController extends Controller
{
    use AuthorizesRequests;

    /**
     * Record that the grupo had no class on a date, or correct an existing record for that date.
     */
    public function store(Request $request, Grupo $grupo): RedirectResponse
    {
        $this->authorize('suspendClass', $grupo);

        $validated = $request->validate([
            'fecha' => ['required', 'date', 'after_or_equal:'.$grupo->fecha_inicio->format('Y-m-d')],
            'motivo' => ['required', Rule::in(array_keys(ClaseSuspendida::MOTIVOS))],
            'observaciones' => ['nullable', 'string', 'max:255'],
            'fecha_reposicion' => ['nullable', 'date', 'different:fecha', 'after_or_equal:'.$grupo->fecha_inicio->format('Y-m-d')],
        ], [
            'fecha.after_or_equal' => 'La fecha no puede ser anterior al inicio del grupo.',
            'fecha_reposicion.after_or_equal' => 'La reposición no puede ser anterior al inicio del grupo.',
            'fecha_reposicion.different' => 'La reposición debe ser en otra fecha.',
        ]);

        $fecha = Carbon::parse($validated['fecha'])->startOfDay();
        $calendario = new CalendarioGrupo($grupo);

        if ($grupo->dias && ! $calendario->esDiaDeClase($fecha)) {
            throw ValidationException::withMessages(['fecha' => 'Ese día no hay clase de este grupo.']);
        }

        if ($grupo->asistencias()->whereDate('asistencias.fecha', $fecha)->exists()) {
            throw ValidationException::withMessages(['fecha' => 'Ese día ya se pasó lista: la clase sí se dio.']);
        }

        $clase = $grupo->clasesSuspendidas()->whereDate('fecha', $fecha)->first() ?? new ClaseSuspendida(['grupo_id' => $grupo->id, 'fecha' => $fecha]);

        $clase->fill([
            'motivo' => $validated['motivo'],
            'observaciones' => $validated['observaciones'] ?? null,
            'fecha_reposicion' => $validated['fecha_reposicion'] ?? null,
            'registrado_por' => $request->user()->id,
        ])->save();

        return back();
    }

    /**
     * Undo a suspension: the class counts as given again.
     */
    public function destroy(ClaseSuspendida $claseSuspendida): RedirectResponse
    {
        $this->authorize('suspendClass', $claseSuspendida->grupo);

        $claseSuspendida->delete();

        return back();
    }
}
