<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\ManagesLoginAccounts;
use App\Http\Controllers\Concerns\ManagesPhotos;
use App\Http\Controllers\Controller;
use App\Models\Director;
use App\Models\Grupo;
use App\Models\Plantel;
use App\Models\Profesor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Directors are registered here, with their record, their login account (always created,
 * a director is only useful signed in) and the planteles they run.
 */
class DirectorController extends Controller
{
    use ManagesLoginAccounts, ManagesPhotos;

    /**
     * Display a listing of directores.
     */
    public function index(Request $request): Response
    {
        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $search = trim((string) $request->string('search'));
        $estado = in_array($request->string('estado')->toString(), ['activos', 'inactivos'], true) ? $request->string('estado')->toString() : null;

        // Search only; the activo tab is applied on top so every tab can show its count.
        $filtrados = fn () => Director::query()
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido_paterno', 'like', "%{$search}%")
                    ->orWhere('apellido_materno', 'like', "%{$search}%")
                    ->orWhere('curp', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }));

        $activos = $filtrados()->where('activo', true)->count();
        $todos = $filtrados()->count();

        $directores = $filtrados()
            ->with(['planteles' => fn ($query) => $query->orderBy('nombre')->select('planteles.id', 'nombre', 'clave', 'activo')])
            ->when($estado, fn ($query) => $query->where('activo', $estado === 'activos'))
            ->orderByDesc('activo')
            ->orderBy('apellido_paterno')
            ->orderBy('nombre')
            ->paginate($perPage)
            ->withQueryString();

        $actividad = $this->actividadDePlanteles($directores->getCollection()->flatMap->planteles->pluck('id')->unique()->all());
        $fichasDeProfesor = $this->fichasDeProfesor($directores->getCollection());

        $directores->through(fn (Director $director) => [
            'id' => $director->id,
            'nombre_completo' => $director->nombre_completo,
            'foto_url' => $director->fotoUrl(),
            'telefono' => $director->telefono,
            'email' => $director->email,
            'activo' => $director->activo,
            'es_yo' => $director->user_id === $request->user()->id,
            'profesor_id' => $fichasDeProfesor[$director->id] ?? null,
            'planteles' => $director->planteles->map(fn (Plantel $plantel) => [
                'id' => $plantel->id,
                'nombre' => $plantel->nombre,
                'clave' => $plantel->clave,
                'activo' => $plantel->activo,
                ...$actividad[$plantel->id],
            ]),
        ]);

        return Inertia::render('admin/directores/index', [
            'directores' => $directores,
            'conteos' => ['todos' => $todos, 'activos' => $activos, 'inactivos' => $todos - $activos],
            // Active planteles nobody runs: their information only reaches the admins.
            'plantelesSinDirector' => Plantel::where('activo', true)
                ->whereNotIn('id', $this->plantelesConDirector())
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'clave']),
            'filters' => ['search' => $search, 'estado' => $estado],
            'perPage' => $perPage,
        ]);
    }

    /**
     * What is going on at each plantel: grupos running and planned, active alumnos and, while nothing runs yet,
     * the next opening date.
     *
     * @param  array<int, int>  $plantelIds
     * @return array<int, array{grupos_en_curso: int, grupos_planeados: int, alumnos: int, proxima_apertura: ?string}>
     */
    private function actividadDePlanteles(array $plantelIds): array
    {
        return Plantel::whereIn('id', $plantelIds)
            ->withCount([
                'grupos as grupos_en_curso' => fn ($query) => $query->where('estado', 'en_curso'),
                'grupos as grupos_planeados' => fn ($query) => $query->where('estado', 'planeado'),
                'inscripciones as alumnos' => fn ($query) => $query
                    ->where('inscripciones.estado', 'activo')
                    ->whereIn('grupos.estado', Grupo::ESTADOS_ACTIVOS),
            ])
            ->withMin(['grupos as proxima_apertura' => fn ($query) => $query
                ->where('estado', 'planeado')
                ->whereDate('fecha_inicio', '>=', now()->toDateString())], 'fecha_inicio')
            ->get()
            ->mapWithKeys(fn (Plantel $plantel) => [$plantel->id => [
                'grupos_en_curso' => $plantel->grupos_en_curso,
                'grupos_planeados' => $plantel->grupos_planeados,
                'alumnos' => $plantel->alumnos,
                'proxima_apertura' => $plantel->proxima_apertura ? Carbon::parse($plantel->proxima_apertura)->format('Y-m-d') : null,
            ]])
            ->all();
    }

    /**
     * A director who also teaches has a separate profesor record (and account); it is matched here by full name
     * so the listing can link to it.
     *
     * @param  Collection<int, Director>  $directores
     * @return array<int, int> director id => profesor id
     */
    private function fichasDeProfesor(Collection $directores): array
    {
        $clave = fn ($persona) => Str::lower(Str::ascii(trim("{$persona->nombre} {$persona->apellido_paterno} {$persona->apellido_materno}")));

        // Compared in PHP, accents and case aside, so "Martínez" and "Martinez" match on every database.
        $profesores = Profesor::query()
            ->get(['id', 'nombre', 'apellido_paterno', 'apellido_materno'])
            ->keyBy($clave);

        return $directores
            ->mapWithKeys(fn (Director $director) => [$director->id => $profesores->get($clave($director))?->id])
            ->filter()
            ->all();
    }

    /**
     * Ids of the planteles some (non-deleted) director runs.
     *
     * @return array<int, int>
     */
    private function plantelesConDirector(): array
    {
        return DB::table('plantel_user')
            ->join('directores', 'directores.user_id', '=', 'plantel_user.user_id')
            ->whereNull('directores.deleted_at')
            ->distinct()
            ->pluck('plantel_user.plantel_id')
            ->all();
    }

    /**
     * Show the form for registering a new director.
     */
    public function create(): Response
    {
        return Inertia::render('admin/directores/create', [
            'planteles' => $this->plantelesDisponibles(),
        ]);
    }

    /**
     * Store a new director together with their account and planteles.
     */
    public function store(Request $request): RedirectResponse
    {
        // A director always signs in, so the account is always created.
        $request->merge(['crear_cuenta' => true]);
        $validated = $this->validated($request);

        DB::transaction(function () use ($request, $validated) {
            $director = new Director($validated);
            $this->applyPhoto($request, $director, 'directores');
            $this->syncAccount($director, $validated, 'Director');
            $director->save();
            $director->planteles()->sync($validated['planteles']);
        });

        return to_route('admin.directores.index');
    }

    /**
     * Show the form for editing the given director.
     */
    public function edit(Director $director): Response
    {
        return Inertia::render('admin/directores/edit', [
            'director' => [
                'id' => $director->id,
                ...$director->only([
                    'nombre',
                    'apellido_paterno',
                    'apellido_materno',
                    'curp',
                    'telefono',
                    'email',
                    'activo',
                ]),
                'fecha_nacimiento' => $director->fecha_nacimiento?->format('Y-m-d'),
                'foto_url' => $director->fotoUrl(),
                'planteles' => $director->planteles()->pluck('planteles.id'),
                'profesor_id' => $this->fichasDeProfesor(collect([$director]))[$director->id] ?? null,
            ],
            'planteles' => $this->plantelesDisponibles($director),
            // Activity of every plantel, so the side summary follows the boxes being ticked.
            'actividad' => $this->actividadDePlanteles(Plantel::pluck('id')->all()),
        ]);
    }

    /**
     * Update the given director, their account and planteles.
     */
    public function update(Request $request, Director $director): RedirectResponse
    {
        $validated = $this->validated($request, $director);
        $fotoAnterior = $director->foto;

        DB::transaction(function () use ($request, $director, $validated) {
            $director->fill($validated);
            $this->applyPhoto($request, $director, 'directores');
            $this->syncAccount($director, $validated, 'Director');
            $director->save();
            $director->planteles()->sync($validated['planteles']);
        });

        $this->deleteReplacedPhoto($fotoAnterior, $director);

        return to_route('admin.directores.index');
    }

    /**
     * Remove the given director: the record goes, the account stays (it may be an admin or
     * appear as who enrolled alumnos) but loses the Director role and its planteles.
     */
    public function destroy(Director $director): RedirectResponse
    {
        if ($director->user_id === auth()->id()) {
            return back()->withErrors(['director' => 'No puedes eliminar tu propia ficha de director.']);
        }

        DB::transaction(function () use ($director) {
            $director->planteles()->detach();
            $director->user?->removeRole('Director');
            $director->delete();
        });

        return to_route('admin.directores.index');
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Director $director = null): array
    {
        $request->merge(['curp' => $request->filled('curp') ? strtoupper((string) $request->input('curp')) : null]);

        return $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'apellido_paterno' => ['required', 'string', 'max:255'],
            'apellido_materno' => ['nullable', 'string', 'max:255'],
            'curp' => ['nullable', 'string', 'size:18', 'regex:/^[A-Z0-9]{18}$/', Rule::unique('directores', 'curp')->ignore($director?->id)],
            'fecha_nacimiento' => ['nullable', 'date', 'before:today'],
            'telefono' => ['nullable', 'string', 'max:15'],
            'activo' => ['boolean'],
            'planteles' => ['required', 'array', 'min:1'],
            'planteles.*' => ['integer', Rule::exists('planteles', 'id')->whereNull('deleted_at')],
            ...$this->photoRules(),
            ...$this->accountRules($request, $director),
        ], [
            ...$this->photoMessages(),
            'planteles.required' => 'Elige al menos un plantel que dirija.',
            'planteles.min' => 'Elige al menos un plantel que dirija.',
        ]);
    }

    /**
     * Every plantel, with the other directors who already run it (a plantel may have several).
     *
     * @return Collection<int, array{id: int, nombre: string, clave: string, activo: bool, directores: array<int, string>}>
     */
    private function plantelesDisponibles(?Director $director = null): Collection
    {
        $otros = Director::query()
            ->when($director, fn ($query) => $query->whereKeyNot($director->id))
            ->with('planteles:planteles.id')
            ->get();

        return Plantel::orderByDesc('activo')->orderBy('nombre')->get(['id', 'nombre', 'clave', 'activo'])
            ->map(fn (Plantel $plantel) => [
                'id' => $plantel->id,
                'nombre' => $plantel->nombre,
                'clave' => $plantel->clave,
                'activo' => $plantel->activo,
                'directores' => $otros
                    ->filter(fn (Director $otro) => $otro->planteles->contains('id', $plantel->id))
                    ->map(fn (Director $otro) => $otro->nombre_completo)
                    ->values()
                    ->all(),
            ]);
    }
}
