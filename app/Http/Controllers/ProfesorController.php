<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ManagesLoginAccounts;
use App\Http\Controllers\Concerns\ManagesPhotos;
use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Support\Dashboard\ResumenEscolar;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProfesorController extends Controller
{
    use AuthorizesRequests, ManagesLoginAccounts, ManagesPhotos;

    /** List tabs: teaching a planned or running grupo within reach, active without any, or marked inactive. */
    private const SITUACIONES = ['con_grupos', 'sin_grupo', 'inactivos'];

    /**
     * Display a listing of profesores.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Profesor::class);

        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $search = trim((string) $request->string('search'));
        $situacion = in_array($request->string('situacion')->toString(), self::SITUACIONES, true) ? $request->string('situacion')->toString() : null;

        $user = $request->user();
        $alcance = $user->plantelesAlcance();
        $plantelId = $request->integer('plantel_id') ?: null;
        $plantelId = $user->alcanzaPlantel($plantelId) ? $plantelId : null;
        $planteles = $plantelId ? [$plantelId] : $alcance;

        // Planned or running grupos within reach (and the plantel filter).
        $gruposActivos = fn ($query) => $query
            ->whereIn('estado', Grupo::ESTADOS_ACTIVOS)
            ->when($planteles !== null, fn ($query) => $query->whereIn('plantel_id', $planteles));

        // Visibility, plantel and search; the situación tab is applied on top so every tab can show its count.
        $filtrados = fn () => Profesor::query()
            ->visiblePara($user)
            ->when($plantelId, fn ($query) => $query->whereHas('grupos', $gruposActivos))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido_paterno', 'like', "%{$search}%")
                    ->orWhere('apellido_materno', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('especialidad', 'like', "%{$search}%");
            }));

        $porSituacion = fn ($query, ?string $situacion) => match ($situacion) {
            'con_grupos' => $query->where('activo', true)->whereHas('grupos', $gruposActivos),
            'sin_grupo' => $query->where('activo', true)->whereDoesntHave('grupos', fn ($query) => $query->whereIn('estado', Grupo::ESTADOS_ACTIVOS)),
            'inactivos' => $query->where('activo', false),
            default => $query,
        };

        // Attendance over the last 30 days and overdue roll calls, computed exactly as on the dashboards.
        $resumen = new ResumenEscolar($planteles);
        $enCurso = $resumen->gruposEnCurso()->keyBy('id');

        $profesores = $porSituacion($filtrados(), $situacion)
            ->with(['grupos' => fn ($query) => $gruposActivos($query)
                ->with('curso:id,nombre,clave', 'plantel:id,nombre,clave')
                ->withCount(['inscripciones as inscritos' => fn ($query) => $query->where('estado', 'activo')])
                ->orderByRaw("case estado when 'en_curso' then 0 else 1 end")
                ->orderBy('fecha_inicio')])
            ->orderByDesc('activo')
            ->orderBy('apellido_paterno')
            ->orderBy('nombre')
            ->paginate($perPage)
            ->withQueryString()
            ->through(function (Profesor $profesor) use ($enCurso, $resumen) {
                $grupos = $profesor->grupos->map(fn (Grupo $grupo) => $this->resumenGrupo($grupo, $enCurso->get($grupo->id), $resumen));
                $registros = $profesor->grupos->sum(fn (Grupo $grupo) => $enCurso->get($grupo->id)['registros_30'] ?? 0);
                $faltas = $profesor->grupos->sum(fn (Grupo $grupo) => $enCurso->get($grupo->id)['faltas_30'] ?? 0);

                return [
                    ...$this->datos($profesor),
                    'grupos' => $grupos,
                    'estadisticas' => [
                        'alumnos' => $grupos->sum('inscritos'),
                        'horas_semana' => round($grupos->where('estado', 'en_curso')->sum('horas_semana'), 1),
                        'asistencia' => Asistencia::porcentaje($registros, $faltas),
                        'listas_atrasadas' => $grupos->where('lista_atrasada', true)->count(),
                    ],
                ];
            });

        return Inertia::render('profesores/index', [
            'profesores' => $profesores,
            'conteos' => collect([null, ...self::SITUACIONES])
                ->mapWithKeys(fn (?string $valor) => [$valor ?? 'todos' => $porSituacion($filtrados(), $valor)->count()]),
            'planteles' => Plantel::alcanceDe($user)->orderBy('nombre')->get(['id', 'nombre']),
            'filters' => ['search' => $search, 'plantel_id' => $plantelId, 'situacion' => $situacion],
            'perPage' => $perPage,
            'canManage' => $user->can('manage teachers'),
        ]);
    }

    /**
     * The profesor's own data for their card.
     *
     * @return array<string, mixed>
     */
    private function datos(Profesor $profesor): array
    {
        return [
            'id' => $profesor->id,
            'nombre_completo' => $profesor->nombre_completo,
            'foto_url' => $profesor->fotoUrl(),
            'especialidad' => $profesor->especialidad,
            'telefono' => $profesor->telefono,
            'email' => $profesor->email,
            'activo' => $profesor->activo,
            'tiene_cuenta' => $profesor->user_id !== null,
        ];
    }

    /**
     * One grupo the profesor teaches: curso, plantel, schedule, weekly hours, alumnos and, while running,
     * the last 30 days' attendance and whether the roll call is overdue (from ResumenEscolar::gruposEnCurso()).
     *
     * @param  array<string, mixed>|null  $enCurso
     * @return array<string, mixed>
     */
    private function resumenGrupo(Grupo $grupo, ?array $enCurso, ResumenEscolar $resumen): array
    {
        $dias = array_values(array_filter(explode(',', (string) $grupo->dias)));
        $horas = $grupo->hora_inicio && $grupo->hora_fin
            ? Carbon::parse($grupo->hora_inicio)->diffInMinutes(Carbon::parse($grupo->hora_fin)) / 60
            : 0;

        return [
            'id' => $grupo->id,
            'clave' => $grupo->clave,
            'estado' => $grupo->estado,
            'curso' => $grupo->curso->nombre,
            'curso_clave' => $grupo->curso->clave,
            'plantel' => $grupo->plantel->nombre,
            'plantel_clave' => $grupo->plantel->clave,
            'dias' => $dias,
            'hora_inicio' => $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5) : null,
            'hora_fin' => $grupo->hora_fin ? substr($grupo->hora_fin, 0, 5) : null,
            'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
            'horas_semana' => $horas * count($dias),
            'inscritos' => (int) $grupo->inscritos,
            'asistencia' => $enCurso['asistencia'] ?? null,
            'lista_atrasada' => $enCurso !== null && $resumen->listaAtrasada($enCurso),
            'dias_sin_lista' => $enCurso['dias_sin_lista'] ?? null,
        ];
    }

    /**
     * Show the form for creating a new profesor.
     */
    public function create(): Response
    {
        $this->authorize('create', Profesor::class);

        return Inertia::render('profesores/create', [
            'especialidades' => $this->especialidades(),
        ]);
    }

    /**
     * Store a newly created profesor, optionally with a login account.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Profesor::class);

        $validated = $this->validated($request);

        DB::transaction(function () use ($request, $validated) {
            $profesor = new Profesor($validated);
            $this->applyPhoto($request, $profesor, 'profesores');
            $this->syncAccount($profesor, $validated, 'Profesor');
            $profesor->save();
        });

        return to_route('profesores.index');
    }

    /**
     * Show the form for editing the given profesor.
     */
    public function edit(Request $request, Profesor $profesor): Response
    {
        $this->authorize('update', $profesor);

        $alcance = $request->user()->plantelesAlcance();
        $resumen = new ResumenEscolar($alcance);
        $enCurso = $resumen->gruposEnCurso()->keyBy('id');

        return Inertia::render('profesores/edit', [
            'profesor' => [
                'id' => $profesor->id,
                ...$profesor->only([
                    'nombre',
                    'apellido_paterno',
                    'apellido_materno',
                    'curp',
                    'telefono',
                    'email',
                    'especialidad',
                    'activo',
                ]),
                'fecha_nacimiento' => $profesor->fecha_nacimiento?->format('Y-m-d'),
                'foto_url' => $profesor->fotoUrl(),
                'tiene_cuenta' => $profesor->user_id !== null,
            ],
            // Every grupo they teach within reach: active ones first, then the finished ones.
            'grupos' => $profesor->grupos()
                ->when($alcance !== null, fn ($query) => $query->whereIn('plantel_id', $alcance))
                ->with('curso:id,nombre,clave', 'plantel:id,nombre,clave')
                ->withCount(['inscripciones as inscritos' => fn ($query) => $query->where('estado', 'activo')])
                ->orderByRaw("case estado when 'en_curso' then 0 when 'planeado' then 1 else 2 end")
                ->orderByDesc('fecha_inicio')
                ->get()
                ->map(fn (Grupo $grupo) => $this->resumenGrupo($grupo, $enCurso->get($grupo->id), $resumen)),
            'especialidades' => $this->especialidades(),
        ]);
    }

    /**
     * Names of the active cursos, offered as quick picks for the specialty field.
     *
     * @return array<int, string>
     */
    private function especialidades(): array
    {
        return Curso::where('activo', true)->orderBy('nombre')->pluck('nombre')->all();
    }

    /**
     * Update the given profesor and keep their login account in sync.
     */
    public function update(Request $request, Profesor $profesor): RedirectResponse
    {
        $this->authorize('update', $profesor);

        $validated = $this->validated($request, $profesor);
        $fotoAnterior = $profesor->foto;

        DB::transaction(function () use ($request, $profesor, $validated) {
            $profesor->fill($validated);
            $this->applyPhoto($request, $profesor, 'profesores');
            $this->syncAccount($profesor, $validated, 'Profesor');
            $profesor->save();
        });

        $this->deleteReplacedPhoto($fotoAnterior, $profesor);

        return to_route('profesores.index');
    }

    /**
     * Remove the given profesor.
     */
    public function destroy(Profesor $profesor): RedirectResponse
    {
        $this->authorize('delete', $profesor);

        $gruposActivos = $profesor->grupos()->whereIn('estado', Grupo::ESTADOS_ACTIVOS)->count();

        if ($gruposActivos > 0) {
            return back()->withErrors([
                'profesor' => "No puedes eliminar a este profesor: tiene {$gruposActivos} grupo(s) planeados o en curso. Reasígnalos primero.",
            ]);
        }

        DB::transaction(function () use ($profesor) {
            // The account is kept (it may hold other roles) but loses teacher access.
            $profesor->user?->removeRole('Profesor');
            $profesor->delete();
        });

        return to_route('profesores.index');
    }

    /**
     * Validate the given request's profesor data.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Profesor $profesor = null): array
    {
        $request->merge(['curp' => $request->filled('curp') ? strtoupper((string) $request->input('curp')) : null]);

        return $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'apellido_paterno' => ['required', 'string', 'max:255'],
            'apellido_materno' => ['nullable', 'string', 'max:255'],
            'curp' => ['nullable', 'string', 'size:18', 'regex:/^[A-Z0-9]{18}$/', Rule::unique('profesores', 'curp')->ignore($profesor?->id)],
            'fecha_nacimiento' => ['nullable', 'date', 'before:today'],
            'telefono' => ['nullable', 'string', 'max:15'],
            'especialidad' => ['nullable', 'string', 'max:255'],
            'activo' => ['boolean'],
            ...$this->photoRules(),
            ...$this->accountRules($request, $profesor),
        ], $this->photoMessages());
    }
}
