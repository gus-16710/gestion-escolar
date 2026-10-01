<?php

namespace App\Http\Controllers;

use App\Models\Plantel;
use App\Support\Dashboard\ResumenAlumno;
use App\Support\Dashboard\ResumenEscolar;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Show the dashboard for the signed-in user's role.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        if ($user->hasRole('Admin')) {
            return $this->admin($request);
        }

        if ($user->hasRole('Director')) {
            return $this->director($request);
        }

        if ($user->hasRole('Profesor')) {
            return $this->profesor($request);
        }

        if ($user->hasRole('Alumno')) {
            $alumno = $user->alumno;

            return Inertia::render('dashboard/alumno', [
                ...($alumno ? (new ResumenAlumno($alumno))->datos() : []),
                // An account with the role but no alumno record has nothing to show.
                'sinFicha' => $alumno === null,
                'hoy' => now()->format('Y-m-d'),
            ]);
        }

        // Other roles get a simple start page until their own dashboards are built.
        return Inertia::render('dashboard');
    }

    private function admin(Request $request): Response
    {
        $planteles = Plantel::orderByDesc('activo')->orderBy('nombre')->get(['id', 'nombre', 'activo']);
        $plantelId = $this->plantelElegido($request, $planteles);

        return Inertia::render('dashboard/admin', [
            ...(new ResumenEscolar($plantelId ? [$plantelId] : null))->datos(),
            'plantelesFiltro' => $planteles,
            'plantelId' => $plantelId,
            'hoy' => now()->format('Y-m-d'),
        ]);
    }

    /**
     * Same figures as the admin, limited to the planteles the director is assigned to.
     */
    private function director(Request $request): Response
    {
        $planteles = $request->user()->planteles()
            ->orderByDesc('activo')
            ->orderBy('nombre')
            ->get(['planteles.id', 'nombre', 'activo']);

        if ($planteles->isEmpty()) {
            return Inertia::render('dashboard/director', ['sinPlantel' => true, 'hoy' => now()->format('Y-m-d')]);
        }

        $plantelId = $this->plantelElegido($request, $planteles);
        $resumen = new ResumenEscolar($plantelId ? [$plantelId] : $planteles->pluck('id')->all());

        return Inertia::render('dashboard/director', [
            ...$resumen->datos(),
            'proximosGrupos' => $resumen->proximosGrupos(),
            'profesores' => $resumen->profesores(),
            'sinPlantel' => false,
            'plantelesFiltro' => $planteles->map(fn (Plantel $plantel) => $plantel->only('id', 'nombre', 'activo'))->values(),
            'plantelId' => $plantelId,
            'hoy' => now()->format('Y-m-d'),
        ]);
    }

    /**
     * The profesor's own grupos: today's classes, their students' attendance and overdue roll calls.
     */
    private function profesor(Request $request): Response
    {
        $profesor = $request->user()->profesor;

        // An account with the role but no profesor record has no grupos to show.
        if ($profesor === null) {
            return Inertia::render('dashboard/profesor', ['sinFicha' => true, 'hoy' => now()->format('Y-m-d')]);
        }

        $resumen = new ResumenEscolar(profesorId: $profesor->id);
        $gruposEnCurso = $resumen->gruposEnCurso();

        return Inertia::render('dashboard/profesor', [
            'sinFicha' => false,
            'kpis' => $resumen->kpis(),
            'clasesDeHoy' => $resumen->clasesDeHoy(),
            'gruposEnCurso' => $gruposEnCurso->values()->all(),
            'alumnosEnRiesgo' => $resumen->alumnosEnRiesgo(),
            'listasPendientes' => $resumen->listasPendientes(),
            'calificacionesPendientes' => $resumen->calificacionesPendientes(),
            'asistenciaSemanal' => $resumen->asistenciaSemanal(),
            'proximosGrupos' => $resumen->proximosGrupos(),
            'variosPlanteles' => $gruposEnCurso->pluck('plantel')->unique()->count() > 1,
            'hoy' => now()->format('Y-m-d'),
        ]);
    }

    /**
     * The ?plantel_id= filter, ignored unless it is one of the allowed planteles.
     *
     * @param  Collection<int, Plantel>  $permitidos
     */
    private function plantelElegido(Request $request, Collection $permitidos): ?int
    {
        $plantelId = $request->integer('plantel_id') ?: null;

        return $plantelId !== null && $permitidos->contains('id', $plantelId) ? $plantelId : null;
    }
}
