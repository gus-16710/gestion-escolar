<?php

namespace App\Http\Controllers;

use App\Models\Curso;
use App\Models\CursoModulo;
use App\Models\Grupo;
use App\Models\Plantel;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CursoController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of cursos.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Curso::class);

        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $search = trim((string) $request->string('search'));
        $estado = in_array($request->string('estado')->toString(), ['activos', 'inactivos'], true) ? $request->string('estado')->toString() : null;

        // Group figures are for the staff who run grupos (Admin, Director), counted within their plantel reach.
        $user = $request->user();
        $conEstadisticas = $user->can('manage groups');
        $alcance = $user->plantelesAlcance();
        $enAlcance = fn ($query, string $columna) => $query->when($alcance !== null, fn ($query) => $query->whereIn($columna, $alcance));

        // Search only; the activo tab is applied on top so every tab can show its count.
        $filtrados = fn () => Curso::query()
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('nombre', 'like', "%{$search}%")
                    ->orWhere('clave', 'like', "%{$search}%");
            }));

        $activos = $filtrados()->where('activo', true)->count();
        $todos = $filtrados()->count();

        $cursos = $filtrados()
            ->with([
                'planteles' => fn ($query) => $query->orderBy('nombre')->select('planteles.id', 'nombre', 'clave'),
                'modulos:id,curso_id,orden,nombre,duracion_semanas',
            ])
            ->when($conEstadisticas, fn ($query) => $query->withCount([
                'grupos as grupos_en_curso' => fn ($query) => $enAlcance($query->where('estado', 'en_curso'), 'plantel_id'),
                'grupos as grupos_planeados' => fn ($query) => $enAlcance($query->where('estado', 'planeado'), 'plantel_id'),
                'inscripciones as alumnos_activos' => fn ($query) => $enAlcance(
                    $query->where('inscripciones.estado', 'activo')->whereIn('grupos.estado', Grupo::ESTADOS_ACTIVOS),
                    'grupos.plantel_id',
                ),
            ]))
            ->when($estado, fn ($query) => $query->where('activo', $estado === 'activos'))
            ->orderByDesc('activo')
            ->orderBy('nombre')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Curso $curso) => [
                'id' => $curso->id,
                'nombre' => $curso->nombre,
                'clave' => $curso->clave,
                'descripcion' => $curso->descripcion,
                'duracion_semanas' => $curso->duracion_semanas,
                'activo' => $curso->activo,
                'planteles' => $curso->planteles->map(fn (Plantel $plantel) => ['nombre' => $plantel->nombre, 'clave' => $plantel->clave]),
                'modulos' => $curso->modulos->map(fn (CursoModulo $modulo) => $modulo->only('nombre', 'duracion_semanas')),
                'estadisticas' => $conEstadisticas ? [
                    'grupos_en_curso' => $curso->grupos_en_curso,
                    'grupos_planeados' => $curso->grupos_planeados,
                    'alumnos' => $curso->alumnos_activos,
                ] : null,
            ]);

        return Inertia::render('cursos/index', [
            'cursos' => $cursos,
            'conteos' => ['todos' => $todos, 'activos' => $activos, 'inactivos' => $todos - $activos],
            'filters' => ['search' => $search, 'estado' => $estado],
            'perPage' => $perPage,
            'canManage' => $user->can('manage courses'),
            'canViewGroups' => $conEstadisticas,
        ]);
    }

    /**
     * Show the form for creating a new curso.
     */
    public function create(): Response
    {
        $this->authorize('create', Curso::class);

        return Inertia::render('cursos/create', [
            'planteles' => $this->plantelesOpciones(),
            'clavesUsadas' => $this->clavesUsadas(),
        ]);
    }

    /**
     * Store a newly created curso.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Curso::class);

        $validated = $this->validated($request);

        DB::transaction(function () use ($validated) {
            $curso = Curso::create($validated);
            $curso->planteles()->sync($validated['planteles'] ?? []);
            $this->sincronizarModulos($curso, $validated['modulos'] ?? []);
        });

        return to_route('cursos.index');
    }

    /**
     * Show the form for editing the given curso.
     */
    public function edit(Curso $curso): Response
    {
        $this->authorize('update', $curso);

        return Inertia::render('cursos/edit', [
            'curso' => [
                'id' => $curso->id,
                ...$curso->only(['nombre', 'clave', 'descripcion', 'duracion_semanas', 'activo']),
                'planteles' => $curso->planteles()->pluck('planteles.id')->map(fn (int $id) => (string) $id),
                'modulos' => $curso->modulos()->get(['id', 'nombre', 'descripcion', 'duracion_semanas']),
            ],
            'resumen' => [
                ...collect(['planeado', 'en_curso', 'concluido', 'cancelado'])->mapWithKeys(fn (string $estado) => [$estado => 0])
                    ->merge($curso->grupos()->selectRaw('estado, count(*) as total')->groupBy('estado')->pluck('total', 'estado')->map(fn ($total) => (int) $total)),
                'alumnos' => $curso->inscripciones()->where('inscripciones.estado', 'activo')->whereIn('grupos.estado', Grupo::ESTADOS_ACTIVOS)->count(),
            ],
            'planteles' => $this->plantelesOpciones($curso),
            'clavesUsadas' => $this->clavesUsadas($curso),
        ]);
    }

    /**
     * Update the given curso.
     */
    public function update(Request $request, Curso $curso): RedirectResponse
    {
        $this->authorize('update', $curso);

        $validated = $this->validated($request, $curso);
        $plantelIds = array_map('intval', $validated['planteles'] ?? []);

        // A plantel can't stop offering the curso while one of its grupos there is planned or running.
        $bloqueados = $curso->grupos()
            ->whereIn('estado', Grupo::ESTADOS_ACTIVOS)
            ->whereNotIn('plantel_id', $plantelIds)
            ->with('plantel:id,nombre')
            ->get()
            ->groupBy('plantel_id');

        if ($bloqueados->isNotEmpty()) {
            return back()->withErrors([
                'planteles' => $bloqueados
                    ->map(fn ($grupos) => "No puedes quitar {$grupos->first()->plantel->nombre}: tiene {$grupos->count()} grupo(s) de este curso planeados o en curso.")
                    ->implode(' '),
            ]);
        }

        DB::transaction(function () use ($curso, $validated, $plantelIds) {
            $curso->update($validated);
            $curso->planteles()->sync($plantelIds);
            $this->sincronizarModulos($curso, $validated['modulos'] ?? []);
        });

        return to_route('cursos.index');
    }

    /**
     * Remove the given curso.
     */
    public function destroy(Curso $curso): RedirectResponse
    {
        $this->authorize('delete', $curso);

        $gruposActivos = $curso->grupos()->whereIn('estado', Grupo::ESTADOS_ACTIVOS)->count();

        if ($gruposActivos > 0) {
            return back()->withErrors([
                'curso' => "No puedes eliminar este curso: tiene {$gruposActivos} grupo(s) planeados o en curso.",
            ]);
        }

        $curso->delete();

        return to_route('cursos.index');
    }

    /**
     * Validate the given request's curso data.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Curso $curso = null): array
    {
        $request->merge(['clave' => strtoupper((string) $request->input('clave'))]);

        return $request->validate([
            'nombre' => ['required', 'string', 'max:255', Rule::unique('cursos', 'nombre')->ignore($curso?->id)],
            'clave' => ['required', 'string', 'max:10', Rule::unique('cursos', 'clave')->ignore($curso?->id)],
            'descripcion' => ['nullable', 'string', 'max:2000'],
            'duracion_semanas' => ['nullable', 'integer', 'min:1', 'max:520'],
            'activo' => ['boolean'],
            'planteles' => ['array'],
            'planteles.*' => ['integer', 'distinct', Rule::exists('planteles', 'id')->whereNull('deleted_at')],
            // The study plan, in order; an id keeps an existing module (and, later, its grades).
            'modulos' => ['array', 'max:50'],
            'modulos.*.id' => ['nullable', 'integer', 'distinct', Rule::exists('curso_modulos', 'id')->where('curso_id', $curso?->id ?? 0)],
            'modulos.*.nombre' => ['required', 'string', 'max:255', 'distinct:ignore_case'],
            'modulos.*.descripcion' => ['nullable', 'string', 'max:2000'],
            'modulos.*.duracion_semanas' => ['required', 'integer', 'min:1', 'max:520'],
        ], [
            'modulos.*.nombre.distinct' => 'Hay dos módulos con el mismo nombre.',
            'modulos.*.id.exists' => 'Ese módulo no pertenece a este curso.',
        ]);
    }

    /**
     * Make the curso's study plan match the given list: modules missing from it are deleted, the rest are
     * updated or created, and `orden` follows the list. Orders are first moved out of the way so the
     * (curso_id, orden) unique index never collides while rows swap places.
     *
     * @param  array<int, array{id?: int|null, nombre: string, descripcion?: string|null, duracion_semanas: int}>  $modulos
     */
    private function sincronizarModulos(Curso $curso, array $modulos): void
    {
        $conservados = collect($modulos)->pluck('id')->filter()->map(fn ($id) => (int) $id);

        // A module with grades stays: the grades would lose their module (the FK restricts it too).
        $calificado = $curso->modulos()->whereNotIn('id', $conservados)->has('calificaciones')->first();

        if ($calificado) {
            throw ValidationException::withMessages([
                'modulos' => "El módulo «{$calificado->nombre}» ya tiene calificaciones; no se puede quitar del plan de estudios.",
            ]);
        }

        $curso->modulos()->whereNotIn('id', $conservados)->delete();
        $curso->modulos()->update(['orden' => DB::raw('orden + 1000')]);

        foreach (array_values($modulos) as $posicion => $modulo) {
            $datos = [
                'orden' => $posicion + 1,
                'nombre' => trim($modulo['nombre']),
                'descripcion' => $modulo['descripcion'] ?? null,
                'duracion_semanas' => (int) $modulo['duracion_semanas'],
            ];

            empty($modulo['id'])
                ? $curso->modulos()->create($datos)
                : $curso->modulos()->whereKey($modulo['id'])->update($datos);
        }
    }

    /**
     * The planteles the curso can be offered at, for the "¿Dónde se imparte?" options. grupos_activos counts the
     * curso's planned or running grupos at each plantel, which can't stop offering it (see update()).
     *
     * @return Collection<int, array{id: string, nombre: string, clave: string, activo: bool, grupos_activos: int}>
     */
    private function plantelesOpciones(?Curso $curso = null): Collection
    {
        $activos = $curso
            ? $curso->grupos()->whereIn('estado', Grupo::ESTADOS_ACTIVOS)->selectRaw('plantel_id, count(*) as total')->groupBy('plantel_id')->pluck('total', 'plantel_id')
            : collect();

        return Plantel::orderByDesc('activo')->orderBy('nombre')->get(['id', 'nombre', 'clave', 'activo'])
            ->map(fn (Plantel $plantel) => [
                'id' => (string) $plantel->id,
                'nombre' => $plantel->nombre,
                'clave' => $plantel->clave,
                'activo' => $plantel->activo,
                'grupos_activos' => (int) ($activos[$plantel->id] ?? 0),
            ]);
    }

    /**
     * Claves taken by other cursos (trashed ones too, as the unique rule counts them), keyed to their name,
     * so the form can suggest a free one and warn before submitting.
     *
     * @return Collection<string, string>
     */
    private function clavesUsadas(?Curso $curso = null): Collection
    {
        return Curso::withTrashed()->when($curso, fn ($query) => $query->whereKeyNot($curso->id))->pluck('nombre', 'clave');
    }
}
