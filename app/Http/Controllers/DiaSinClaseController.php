<?php

namespace App\Http\Controllers;

use App\Models\DiaSinClase;
use App\Models\Grupo;
use App\Models\Plantel;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The school calendar: holidays and vacations without class, for the whole school or one plantel.
 * Every grupo with class on those days skips them (see App\Support\CalendarioGrupo).
 */
class DiaSinClaseController extends Controller
{
    use AuthorizesRequests;

    /** Longest range accepted, so a typo in the year can't wipe out a whole course. */
    private const MAX_DIAS = 62;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', DiaSinClase::class);

        $user = $request->user();
        $alcance = $user->plantelesAlcance();
        $periodo = $request->string('periodo')->toString() === 'pasados' ? 'pasados' : 'proximos';
        $hoy = today()->toDateString();

        $visibles = fn () => DiaSinClase::query()
            ->when($alcance !== null, fn ($query) => $query->where(fn ($query) => $query->whereNull('plantel_id')->orWhereIn('plantel_id', $alcance)));

        $grupos = Grupo::query()
            ->visiblePara($user)
            ->whereIn('estado', Grupo::ESTADOS_ACTIVOS)
            ->with('curso:id,nombre,clave')
            ->get(['id', 'clave', 'plantel_id', 'curso_id', 'dias', 'fecha_inicio', 'fecha_fin']);

        $dias = $visibles()
            ->with(['plantel:id,nombre', 'registradoPor:id,name'])
            ->when($periodo === 'proximos', fn ($query) => $query->whereDate('fecha_fin', '>=', $hoy)->orderBy('fecha_inicio'))
            ->when($periodo === 'pasados', fn ($query) => $query->whereDate('fecha_fin', '<', $hoy)->orderByDesc('fecha_inicio'))
            ->get()
            ->map(fn (DiaSinClase $dia) => [
                'id' => $dia->id,
                'motivo' => $dia->motivo,
                'fecha_inicio' => $dia->fecha_inicio->format('Y-m-d'),
                'fecha_fin' => $dia->fecha_fin->format('Y-m-d'),
                'plantel_id' => $dia->plantel_id,
                'plantel' => $dia->plantel?->nombre,
                'registrado_por' => $dia->registradoPor?->name,
                'en_curso' => $dia->fecha_inicio->lte(today()) && $dia->fecha_fin->gte(today()),
                'grupos' => $this->gruposAfectados($dia, $grupos),
                'puede_editar' => $user->can('update', $dia),
            ]);

        return Inertia::render('calendario/index', [
            'dias' => $dias,
            'periodo' => $periodo,
            'conteos' => [
                'proximos' => $visibles()->whereDate('fecha_fin', '>=', $hoy)->count(),
                'pasados' => $visibles()->whereDate('fecha_fin', '<', $hoy)->count(),
            ],
            'planteles' => Plantel::alcanceDe($user)->where('activo', true)->orderBy('nombre')->get(['id', 'nombre']),
            'puedeEscuela' => $alcance === null,
            'canManage' => $user->can('create', DiaSinClase::class),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', DiaSinClase::class);

        DiaSinClase::create([...$this->validated($request), 'registrado_por' => $request->user()->id]);

        return back();
    }

    public function update(Request $request, DiaSinClase $diaSinClase): RedirectResponse
    {
        $this->authorize('update', $diaSinClase);

        $diaSinClase->update($this->validated($request));

        return back();
    }

    public function destroy(DiaSinClase $diaSinClase): RedirectResponse
    {
        $this->authorize('delete', $diaSinClase);

        $diaSinClase->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $alcance = $request->user()->plantelesAlcance();

        $validated = $request->validate([
            'motivo' => ['required', 'string', 'max:120'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['required', 'date', 'after_or_equal:fecha_inicio'],
            // Empty means the whole school, which only an unrestricted manager (Admin) can set.
            'plantel_id' => [
                Rule::requiredIf($alcance !== null),
                'nullable',
                Rule::exists('planteles', 'id')->whereNull('deleted_at'),
                Rule::when($alcance !== null, [Rule::in($alcance ?? [])]),
            ],
        ], [
            'plantel_id.required' => 'Elige el plantel.',
            'fecha_fin.after_or_equal' => 'La fecha final no puede ser anterior a la inicial.',
        ]);

        if (Carbon::parse($validated['fecha_inicio'])->diffInDays(Carbon::parse($validated['fecha_fin'])) >= self::MAX_DIAS) {
            throw ValidationException::withMessages(['fecha_fin' => 'El periodo no puede pasar de '.self::MAX_DIAS.' días.']);
        }

        return $validated;
    }

    /**
     * Active grupos of the day's plantel (or any, for a school-wide day) with a class day inside the range.
     *
     * @param  Collection<int, Grupo>  $grupos
     * @return array<int, array{id: int, clave: string, curso: string}>
     */
    private function gruposAfectados(DiaSinClase $dia, Collection $grupos): array
    {
        return $grupos
            ->filter(function (Grupo $grupo) use ($dia) {
                if (! $dia->cubrePlantel($grupo->plantel_id) || $grupo->fecha_inicio->gt($dia->fecha_fin) || ! $grupo->dias) {
                    return false;
                }

                $dias = explode(',', $grupo->dias);

                for ($fecha = $dia->fecha_inicio->copy(); $fecha->lte($dia->fecha_fin); $fecha->addDay()) {
                    if ($fecha->gte($grupo->fecha_inicio) && in_array(Grupo::DIAS[$fecha->dayOfWeekIso - 1], $dias, true)) {
                        return true;
                    }
                }

                return false;
            })
            ->map(fn (Grupo $grupo) => ['id' => $grupo->id, 'clave' => $grupo->clave, 'curso' => $grupo->curso->nombre])
            ->values()
            ->all();
    }
}
