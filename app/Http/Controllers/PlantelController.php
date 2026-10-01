<?php

namespace App\Http\Controllers;

use App\Models\Curso;
use App\Models\Director;
use App\Models\Grupo;
use App\Models\Plantel;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PlantelController extends Controller
{
    use AuthorizesRequests;

    /**
     * Display a listing of planteles.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Plantel::class);

        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $search = trim((string) $request->string('search'));

        $planteles = Plantel::query()
            ->alcanceDe($request->user())
            ->with([
                'cursos' => fn ($query) => $query->orderBy('nombre')->select('cursos.id', 'nombre', 'clave', 'cursos.activo'),
            ])
            ->withCount([
                'grupos as grupos_en_curso' => fn ($query) => $query->where('estado', 'en_curso'),
                'grupos as grupos_planeados' => fn ($query) => $query->where('estado', 'planeado'),
                'inscripciones as alumnos_activos' => fn ($query) => $query
                    ->where('inscripciones.estado', 'activo')
                    ->whereIn('grupos.estado', Grupo::ESTADOS_ACTIVOS),
            ])
            ->withMin(['grupos as proxima_apertura' => fn ($query) => $query
                ->where('estado', 'planeado')
                ->whereDate('fecha_inicio', '>=', now()->toDateString())], 'fecha_inicio')
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('nombre', 'like', "%{$search}%")
                    ->orWhere('clave', 'like', "%{$search}%")
                    ->orWhere('localidad', 'like', "%{$search}%")
                    ->orWhere('municipio', 'like', "%{$search}%");
            }))
            ->orderByDesc('activo')
            ->orderBy('nombre')
            ->paginate($perPage)
            ->withQueryString();

        $ids = $planteles->getCollection()->modelKeys();
        $profesores = $this->profesoresActivos($ids);
        $directores = $this->directores($ids);

        $planteles->through(fn (Plantel $plantel) => [
            ...$this->datos($plantel),
            'estadisticas' => [
                'grupos_en_curso' => $plantel->grupos_en_curso,
                'grupos_planeados' => $plantel->grupos_planeados,
                'alumnos' => $plantel->alumnos_activos,
                'profesores' => (int) ($profesores[$plantel->id] ?? 0),
            ],
            'proxima_apertura' => $plantel->proxima_apertura ? Carbon::parse($plantel->proxima_apertura)->format('Y-m-d') : null,
            'cursos' => $plantel->cursos->map(fn (Curso $curso) => $curso->only('id', 'nombre', 'clave', 'activo')),
            'directores' => $directores[$plantel->id] ?? [],
        ]);

        return Inertia::render('planteles/index', [
            'planteles' => $planteles,
            'perPage' => $perPage,
            'search' => $search,
            'canManage' => $request->user()->can('manage planteles'),
        ]);
    }

    /**
     * Show the form for creating a new plantel.
     */
    public function create(): Response
    {
        $this->authorize('create', Plantel::class);

        return Inertia::render('planteles/create', [
            'clavesUsadas' => $this->clavesUsadas(),
        ]);
    }

    /**
     * Store a newly created plantel.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Plantel::class);

        $validated = $this->validated($request);

        Plantel::create($validated);

        return to_route('planteles.index');
    }

    /**
     * Show the form for editing the given plantel.
     */
    public function edit(Plantel $plantel): Response
    {
        $this->authorize('update', $plantel);

        return Inertia::render('planteles/edit', [
            'plantel' => [
                'id' => $plantel->id,
                ...$plantel->only([
                    'nombre',
                    'clave',
                    'calle',
                    'numero_exterior',
                    'numero_interior',
                    'colonia',
                    'codigo_postal',
                    'localidad',
                    'municipio',
                    'estado',
                    'telefono',
                    'email',
                    'activo',
                ]),
            ],
            // Read-only: the offer is edited from each curso ("¿Dónde se imparte?").
            'cursos' => $plantel->cursos()->orderBy('nombre')->get(['cursos.id', 'nombre', 'clave', 'cursos.activo'])
                ->map(fn (Curso $curso) => $curso->only('id', 'nombre', 'clave', 'activo')),
            'resumen' => [
                ...collect(['planeado', 'en_curso', 'concluido', 'cancelado'])->mapWithKeys(fn (string $estado) => [$estado => 0])
                    ->merge($plantel->grupos()->selectRaw('estado, count(*) as total')->groupBy('estado')->pluck('total', 'estado')->map(fn ($total) => (int) $total)),
                'alumnos' => $plantel->inscripciones()->where('inscripciones.estado', 'activo')->whereIn('grupos.estado', Grupo::ESTADOS_ACTIVOS)->count(),
                'profesores' => (int) ($this->profesoresActivos([$plantel->id])[$plantel->id] ?? 0),
            ],
            'directores' => $this->directores([$plantel->id])[$plantel->id] ?? [],
            'clavesUsadas' => $this->clavesUsadas($plantel),
        ]);
    }

    /**
     * Update the given plantel.
     */
    public function update(Request $request, Plantel $plantel): RedirectResponse
    {
        $this->authorize('update', $plantel);

        $validated = $this->validated($request, $plantel);

        $plantel->update($validated);

        return to_route('planteles.index');
    }

    /**
     * Remove the given plantel.
     */
    public function destroy(Plantel $plantel): RedirectResponse
    {
        $this->authorize('delete', $plantel);

        $gruposActivos = $plantel->grupos()->whereIn('estado', Grupo::ESTADOS_ACTIVOS)->count();

        if ($gruposActivos > 0) {
            return back()->withErrors([
                'plantel' => "No puedes eliminar este plantel: tiene {$gruposActivos} grupo(s) planeados o en curso.",
            ]);
        }

        $plantel->delete();

        return to_route('planteles.index');
    }

    /**
     * The plantel's own data for its card.
     *
     * @return array<string, mixed>
     */
    private function datos(Plantel $plantel): array
    {
        return [
            'id' => $plantel->id,
            ...$plantel->only(['nombre', 'clave', 'calle', 'numero_exterior', 'numero_interior', 'colonia', 'codigo_postal', 'localidad', 'municipio', 'estado', 'telefono', 'email', 'activo']),
        ];
    }

    /**
     * Distinct profesores teaching a planned or running grupo, per plantel.
     *
     * @param  array<int, int>  $plantelIds
     * @return Collection<int, int>
     */
    private function profesoresActivos(array $plantelIds): Collection
    {
        return Grupo::whereIn('plantel_id', $plantelIds)
            ->whereIn('estado', Grupo::ESTADOS_ACTIVOS)
            ->whereNotNull('profesor_id')
            ->selectRaw('plantel_id, count(distinct profesor_id) as total')
            ->groupBy('plantel_id')
            ->pluck('total', 'plantel_id');
    }

    /**
     * The directors running each plantel (their planteles live in `plantel_user`), with name and photo.
     *
     * @param  array<int, int>  $plantelIds
     * @return array<int, array<int, array{nombre: string, foto_url: ?string}>>
     */
    private function directores(array $plantelIds): array
    {
        $porPlantel = [];

        Director::query()
            ->whereHas('planteles', fn ($query) => $query->whereIn('planteles.id', $plantelIds))
            ->with(['planteles' => fn ($query) => $query->select('planteles.id')])
            ->orderBy('nombre')
            ->get()
            ->each(function (Director $director) use (&$porPlantel, $plantelIds) {
                foreach ($director->planteles->modelKeys() as $plantelId) {
                    if (in_array($plantelId, $plantelIds, true)) {
                        $porPlantel[$plantelId][] = ['nombre' => $director->nombre_completo, 'foto_url' => $director->fotoUrl()];
                    }
                }
            });

        return $porPlantel;
    }

    /**
     * Claves taken by other planteles (trashed ones too, as the unique rule counts them), keyed to their name.
     *
     * @return Collection<string, string>
     */
    private function clavesUsadas(?Plantel $plantel = null): Collection
    {
        return Plantel::withTrashed()->when($plantel, fn ($query) => $query->whereKeyNot($plantel->id))->pluck('nombre', 'clave');
    }

    /**
     * Validate the given request's plantel data.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Plantel $plantel = null): array
    {
        $request->merge(['clave' => strtoupper((string) $request->input('clave'))]);

        return $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'clave' => ['required', 'string', 'max:20', Rule::unique('planteles', 'clave')->ignore($plantel?->id)],
            'calle' => ['required', 'string', 'max:255'],
            'numero_exterior' => ['required', 'string', 'max:20'],
            'numero_interior' => ['nullable', 'string', 'max:20'],
            'colonia' => ['required', 'string', 'max:255'],
            'codigo_postal' => ['required', 'digits:5'],
            'localidad' => ['required', 'string', 'max:255'],
            'municipio' => ['required', 'string', 'max:255'],
            'estado' => ['required', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:15'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'activo' => ['boolean'],
        ]);
    }
}
