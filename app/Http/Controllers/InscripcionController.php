<?php

namespace App\Http\Controllers;

use App\Models\Grupo;
use App\Models\Inscripcion;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InscripcionController extends Controller
{
    use AuthorizesRequests;

    /**
     * Enroll an alumno in the given grupo (or re-enroll one that was dropped).
     */
    public function store(Request $request, Grupo $grupo): RedirectResponse
    {
        $this->authorize('enroll', $grupo);

        $validated = $request->validate([
            'alumno_id' => ['required', Rule::exists('alumnos', 'id')->where('activo', true)->whereNull('deleted_at')],
        ]);

        if (! $grupo->admiteInscripciones()) {
            return back()->withErrors(['alumno_id' => 'Solo se puede inscribir en grupos planeados o en curso.']);
        }

        return DB::transaction(function () use ($request, $grupo, $validated) {
            // Lock the grupo row so two simultaneous enrollments can't both take the last seat.
            $grupo = Grupo::lockForUpdate()->findOrFail($grupo->id);
            $inscritos = $grupo->inscripciones()->where('estado', 'activo')->count();

            if ($grupo->cupo !== null && $inscritos >= $grupo->cupo) {
                return back()->withErrors(['alumno_id' => "El grupo ya está lleno ({$grupo->cupo} lugares)."]);
            }

            $inscripcion = Inscripcion::firstOrNew(['alumno_id' => $validated['alumno_id'], 'grupo_id' => $grupo->id]);

            if ($inscripcion->exists && $inscripcion->estado === 'activo') {
                return back()->withErrors(['alumno_id' => 'El alumno ya está inscrito en este grupo.']);
            }

            $inscripcion->fill([
                'fecha_inscripcion' => now()->toDateString(),
                'estado' => 'activo',
                'fecha_baja' => null,
                'motivo_baja' => null,
                'inscrito_por' => $request->user()->id,
            ])->save();

            return back();
        });
    }

    /**
     * Drop an alumno from the grupo, keeping the enrollment as history.
     */
    public function baja(Request $request, Inscripcion $inscripcion): RedirectResponse
    {
        $this->authorize('enroll', $inscripcion->grupo);

        $validated = $request->validate([
            'motivo_baja' => ['nullable', 'string', 'max:255'],
        ]);

        if ($inscripcion->estado !== 'activo') {
            return back()->withErrors(['inscripcion' => 'Esta inscripción ya no está activa.']);
        }

        $inscripcion->update([
            'estado' => 'baja',
            'fecha_baja' => now()->toDateString(),
            'motivo_baja' => $validated['motivo_baja'] ?? null,
        ]);

        return back();
    }
}
