<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\ClaseSuspendida;
use App\Models\Curso;
use App\Models\DiaSinClase;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use App\Support\CalendarioGrupo;
use App\Support\Dashboard\ResumenEscolar;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class GrupoController extends Controller
{
    use AuthorizesRequests;

    private const ESTADOS = ['planeado', 'en_curso', 'concluido', 'cancelado'];

    private const TURNOS = ['matutino', 'vespertino', 'sabatino', 'dominical'];

    /**
     * Display a listing of grupos.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Grupo::class);

        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $search = trim((string) $request->string('search'));
        $plantelId = $request->integer('plantel_id') ?: null;
        $estado = in_array($request->string('estado')->toString(), self::ESTADOS, true) ? $request->string('estado')->toString() : null;

        // Visibility, plantel and search; the estado tab is applied on top so every tab can show its count.
        $filtrados = fn () => Grupo::query()
            ->visiblePara($request->user())
            ->when($plantelId, fn ($query) => $query->where('plantel_id', $plantelId))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('clave', 'like', "%{$search}%")
                    ->orWhereHas('curso', fn ($query) => $query->where('nombre', 'like', "%{$search}%"))
                    ->orWhereHas('profesor', fn ($query) => $query->where('nombre', 'like', "%{$search}%")
                        ->orWhere('apellido_paterno', 'like', "%{$search}%"));
            }));

        $conteos = $filtrados()->selectRaw('estado, count(*) as total')->groupBy('estado')->pluck('total', 'estado');

        $diasSinClase = DiaSinClase::all();

        $grupos = $filtrados()
            ->with(['plantel:id,nombre', 'curso:id,nombre,clave,duracion_semanas', 'profesor:id,nombre,apellido_paterno,apellido_materno,foto', 'clasesSuspendidas'])
            ->withCount(['inscripciones as inscritos_count' => fn ($query) => $query->where('estado', 'activo')])
            ->when($estado, fn ($query) => $query->where('estado', $estado))
            ->orderByRaw("case estado when 'en_curso' then 0 when 'planeado' then 1 when 'concluido' then 2 else 3 end")
            ->orderByDesc('fecha_inicio')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Grupo $grupo) => $this->fila($grupo, new CalendarioGrupo($grupo, $diasSinClase)));

        return Inertia::render('grupos/index', [
            'grupos' => $grupos,
            'conteos' => collect(self::ESTADOS)->mapWithKeys(fn (string $valor) => [$valor => (int) ($conteos[$valor] ?? 0)])
                ->put('todos', (int) $conteos->sum()),
            'planteles' => Plantel::alcanceDe($request->user())->orderBy('nombre')->get(['id', 'nombre']),
            'filters' => ['search' => $search, 'plantel_id' => $plantelId, 'estado' => $estado],
            'perPage' => $perPage,
            'canManage' => $request->user()->can('manage groups'),
        ]);
    }

    /**
     * One row of the grupo listing.
     *
     * @return array<string, mixed>
     */
    private function fila(Grupo $grupo, CalendarioGrupo $calendario): array
    {
        return [
            'id' => $grupo->id,
            'clave' => $grupo->clave,
            'curso' => $grupo->curso->nombre,
            'curso_clave' => $grupo->curso->clave,
            'plantel' => $grupo->plantel->nombre,
            'profesor' => $grupo->profesor?->nombre_completo,
            'profesor_foto_url' => $grupo->profesor?->fotoUrl(),
            ...$this->horario($grupo),
            'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
            'fecha_fin' => $calendario->finAjustado()?->format('Y-m-d'),
            'avance' => $this->avance($grupo, $calendario),
            'cupo' => $grupo->cupo,
            'inscritos' => $grupo->inscritos_count,
            'estado' => $grupo->estado,
        ];
    }

    /**
     * Display the given grupo with its enrolled alumnos.
     */
    public function show(Request $request, Grupo $grupo): Response
    {
        $this->authorize('view', $grupo);

        $grupo->load(['plantel:id,nombre', 'curso:id,nombre,clave,duracion_semanas', 'curso.modulos', 'profesor', 'inscripciones' => fn ($query) => $query
            ->with(['alumno' => fn ($query) => $query->withTrashed(), 'inscritoPor:id,name', 'calificaciones'])
            ->withCount([
                'asistencias as registros',
                'asistencias as faltas' => fn ($query) => $query->where('estado', 'falta'),
                'asistencias as retardos' => fn ($query) => $query->where('estado', 'retardo'),
            ])
            ->orderByRaw("case estado when 'activo' then 0 when 'egresado' then 1 else 2 end"),
        ]);

        $inscritosActivos = $grupo->inscripciones->where('estado', 'activo');
        $canEnroll = $request->user()->can('enroll', $grupo);

        // Group health over the last 30 days, same window as the dashboards.
        $ultimos30 = $grupo->asistencias()->whereDate('asistencias.fecha', '>=', today()->subDays(30));
        $registros30 = (clone $ultimos30)->count();
        $faltas30 = (clone $ultimos30)->where('asistencias.estado', 'falta')->count();
        $ultimaLista = $grupo->asistencias()->max('asistencias.fecha');
        $calendario = new CalendarioGrupo($grupo);

        return Inertia::render('grupos/show', [
            'grupo' => [
                'id' => $grupo->id,
                'clave' => $grupo->clave,
                'curso' => $grupo->curso->nombre,
                'curso_clave' => $grupo->curso->clave,
                'plantel' => $grupo->plantel->nombre,
                'profesor' => $grupo->profesor?->nombre_completo,
                'profesor_foto_url' => $grupo->profesor?->fotoUrl(),
                'profesor_especialidad' => $grupo->profesor?->especialidad,
                ...$this->horario($grupo),
                'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                'fecha_fin' => $grupo->fecha_fin?->format('Y-m-d'),
                // fecha_fin (or start + the curso's duration when empty), pushed by the classes lost so far.
                'fecha_fin_estimada' => $calendario->finAjustado()?->format('Y-m-d'),
                'semanas_recorridas' => $calendario->semanasRecorridas(),
                'avance' => $this->avance($grupo, $calendario),
                'asistencia_30' => Asistencia::porcentaje($registros30, $faltas30),
                'registros_30' => $registros30,
                'dias_sin_lista' => $ultimaLista ? (int) Carbon::parse($ultimaLista)->startOfDay()->diffInDays(today()) : null,
                'lista_atrasada' => $grupo->estado === 'en_curso' && ResumenEscolar::sinListaReciente(
                    $ultimaLista ? Carbon::parse($ultimaLista) : null,
                    $calendario->ultimaSinClase(today()),
                ),
                'cupo' => $grupo->cupo,
                'inscritos' => $inscritosActivos->count(),
                'estado' => $grupo->estado,
                'admite_inscripciones' => $grupo->admiteInscripciones(),
                'curso_id' => $grupo->curso_id,
            ],
            'modulos' => $this->conCalificaciones($calendario->modulos($grupo->curso->modulos), $inscritosActivos),
            'clasesSinImpartir' => $calendario->clasesSinImpartir(),
            'motivosSuspension' => ClaseSuspendida::MOTIVOS,
            'canEditCurso' => $request->user()->can('update', $grupo->curso),
            'inscripciones' => $grupo->inscripciones->map(fn (Inscripcion $inscripcion) => [
                'id' => $inscripcion->id,
                'alumno_id' => $inscripcion->alumno_id,
                'matricula' => $inscripcion->alumno->matricula,
                'nombre_completo' => $inscripcion->alumno->nombre_completo,
                'foto_url' => $inscripcion->alumno->fotoUrl(),
                'telefono' => $inscripcion->alumno->telefono,
                'estado' => $inscripcion->estado,
                'fecha_inscripcion' => $inscripcion->fecha_inscripcion->format('Y-m-d'),
                'fecha_baja' => $inscripcion->fecha_baja?->format('Y-m-d'),
                'motivo_baja' => $inscripcion->motivo_baja,
                'inscrito_por' => $inscripcion->inscritoPor?->name,
                'asistencia' => [
                    'porcentaje' => Asistencia::porcentaje($inscripcion->registros, $inscripcion->faltas),
                    'registros' => $inscripcion->registros,
                    'faltas' => $inscripcion->faltas,
                    'retardos' => $inscripcion->retardos,
                ],
            ])->values(),
            // Active alumnos not currently enrolled, for the enrollment picker.
            'alumnosDisponibles' => $canEnroll && $grupo->admiteInscripciones()
                ? Alumno::where('activo', true)
                    ->whereNotIn('id', $inscritosActivos->pluck('alumno_id'))
                    ->orderBy('apellido_paterno')
                    ->orderBy('nombre')
                    ->get()
                    ->map(fn (Alumno $alumno) => [
                        'id' => $alumno->id,
                        'matricula' => $alumno->matricula,
                        'nombre_completo' => $alumno->nombre_completo,
                        'foto_url' => $alumno->fotoUrl(),
                    ])
                : [],
            'canManage' => $request->user()->can('update', $grupo),
            'canEnroll' => $canEnroll,
            'canViewAttendance' => $request->user()->can('viewAttendance', $grupo),
            'canTakeAttendance' => $request->user()->can('takeAttendance', $grupo),
            'canSuspend' => $request->user()->can('suspendClass', $grupo),
            'canViewGrades' => $request->user()->can('viewGrades', $grupo),
        ]);
    }

    /**
     * Show the form for creating a new grupo.
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', Grupo::class);

        return Inertia::render('grupos/create', $this->formOptions($request->user()));
    }

    /**
     * Store a newly created grupo.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Grupo::class);

        $validated = $this->validated($request);

        $grupo = DB::transaction(function () use ($validated) {
            $validated['clave'] ??= Grupo::siguienteClave(
                Curso::findOrFail($validated['curso_id']),
                Plantel::findOrFail($validated['plantel_id']),
                (int) date('Y', strtotime($validated['fecha_inicio'])),
            );

            return Grupo::create($validated);
        });

        return to_route('grupos.show', $grupo);
    }

    /**
     * Show the form for editing the given grupo.
     */
    public function edit(Request $request, Grupo $grupo): Response
    {
        $this->authorize('update', $grupo);

        return Inertia::render('grupos/edit', [
            'grupo' => [
                'id' => $grupo->id,
                'plantel_id' => $grupo->plantel_id,
                'curso_id' => $grupo->curso_id,
                'profesor_id' => $grupo->profesor_id,
                'clave' => $grupo->clave,
                'turno' => $grupo->turno,
                'dias' => $grupo->dias ? explode(',', $grupo->dias) : [],
                'hora_inicio' => $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5) : null,
                'hora_fin' => $grupo->hora_fin ? substr($grupo->hora_fin, 0, 5) : null,
                'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                'fecha_fin' => $grupo->fecha_fin?->format('Y-m-d'),
                'cupo' => $grupo->cupo,
                'estado' => $grupo->estado,
            ],
            ...$this->formOptions($request->user(), $grupo),
        ]);
    }

    /**
     * Update the given grupo.
     */
    public function update(Request $request, Grupo $grupo): RedirectResponse
    {
        $this->authorize('update', $grupo);

        $validated = $this->validated($request, $grupo);

        $grupo->update($validated);

        return to_route('grupos.show', $grupo);
    }

    /**
     * Remove the given grupo.
     */
    public function destroy(Grupo $grupo): RedirectResponse
    {
        $this->authorize('delete', $grupo);

        $inscritos = $grupo->inscripciones()->where('estado', 'activo')->count();

        if ($inscritos > 0) {
            return back()->withErrors([
                'grupo' => "No puedes eliminar este grupo: tiene {$inscritos} alumno(s) inscritos. Dalos de baja o marca el grupo como cancelado.",
            ]);
        }

        $grupo->delete();

        return to_route('grupos.index');
    }

    /**
     * Options shared by the create and edit forms.
     *
     * @return array<string, mixed>
     */
    private function formOptions(User $user, ?Grupo $grupo = null): array
    {
        return [
            // Each plantel carries the ids of the cursos it offers, so the form can filter the curso select.
            'planteles' => Plantel::with('cursos:cursos.id')
                ->alcanceDe($user)
                ->where(fn ($query) => $query->where('activo', true)->when($grupo, fn ($query) => $query->orWhere('id', $grupo->plantel_id)))
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'clave'])
                ->map(fn (Plantel $plantel) => [
                    'id' => $plantel->id,
                    'nombre' => $plantel->nombre,
                    'clave' => $plantel->clave,
                    'curso_ids' => $plantel->cursos->pluck('id'),
                ]),
            'cursos' => Curso::where(fn ($query) => $query->where('activo', true)->when($grupo, fn ($query) => $query->orWhere('id', $grupo->curso_id)))
                ->orderBy('nombre')
                ->get(['id', 'nombre', 'clave', 'duracion_semanas']),
            // curso_ids: the cursos each profesor already teaches, so the form can suggest them first.
            'profesores' => Profesor::where('activo', true)
                ->when($grupo?->profesor_id, fn ($query) => $query->orWhere('id', $grupo->profesor_id))
                ->with(['grupos' => fn ($query) => $query->select('id', 'profesor_id', 'curso_id')])
                ->orderBy('apellido_paterno')
                ->orderBy('nombre')
                ->get()
                ->map(fn (Profesor $profesor) => [
                    'id' => $profesor->id,
                    'nombre_completo' => $profesor->nombre_completo,
                    'especialidad' => $profesor->especialidad,
                    'foto_url' => $profesor->fotoUrl(),
                    'curso_ids' => $profesor->grupos->pluck('curso_id')->unique()->values(),
                ]),
            'dias' => Grupo::DIAS,
            // Every clave ever used (trashed included), so the form can preview what Grupo::siguienteClave() will assign.
            'clavesUsadas' => Grupo::withTrashed()->pluck('clave'),
        ];
    }

    /**
     * Validate the given request's grupo data.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Grupo $grupo = null): array
    {
        $request->merge(['clave' => $request->filled('clave') ? strtoupper((string) $request->input('clave')) : null]);

        $alcance = $request->user()->plantelesAlcance();

        $validated = $request->validate([
            'plantel_id' => [
                'required',
                Rule::exists('planteles', 'id')->whereNull('deleted_at'),
                // Directors can only open (or move) grupos in the planteles they run.
                Rule::when($alcance !== null, [Rule::in($alcance ?? [])]),
            ],
            'curso_id' => ['required', Rule::exists('cursos', 'id')->whereNull('deleted_at')],
            'profesor_id' => ['nullable', Rule::exists('profesores', 'id')->whereNull('deleted_at')],
            'clave' => ['nullable', 'string', 'max:30', Rule::unique('grupos', 'clave')->ignore($grupo?->id)],
            'turno' => ['required', Rule::in(self::TURNOS)],
            'dias' => ['array'],
            'dias.*' => ['string', Rule::in(Grupo::DIAS)],
            'hora_inicio' => ['nullable', 'date_format:H:i'],
            'hora_fin' => ['nullable', 'date_format:H:i', 'after:hora_inicio'],
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
            'cupo' => ['nullable', 'integer', 'min:1', 'max:500'],
            'estado' => ['required', Rule::in(self::ESTADOS)],
        ]);

        if (! Plantel::find($validated['plantel_id'])->cursos()->whereKey($validated['curso_id'])->exists()) {
            throw ValidationException::withMessages([
                'curso_id' => 'Este curso no se ofrece en el plantel seleccionado. Agrégalo a la oferta del plantel primero.',
            ]);
        }

        if ($grupo && $validated['cupo'] !== null) {
            $inscritos = $grupo->inscripciones()->where('estado', 'activo')->count();

            if ($validated['cupo'] < $inscritos) {
                throw ValidationException::withMessages([
                    'cupo' => "El cupo no puede ser menor a los {$inscritos} alumnos inscritos.",
                ]);
            }
        }

        // Keep the days in week order no matter how they were checked.
        $validated['dias'] = collect(Grupo::DIAS)->intersect($validated['dias'] ?? [])->implode(',') ?: null;

        if ($validated['clave'] === null) {
            unset($validated['clave']);
        }

        return $validated;
    }

    /**
     * Where the grupo stands in time: "week X of Y" while running (Y counting the weeks lost to
     * classes not given), days to go while planned.
     *
     * @return array{semana?: int, semanas?: int, porcentaje?: int, dias_para_inicio?: int}|null
     */
    private function avance(Grupo $grupo, CalendarioGrupo $calendario): ?array
    {
        $hoy = today();

        if ($grupo->estado === 'planeado' && $grupo->fecha_inicio->isAfter($hoy)) {
            return ['dias_para_inicio' => (int) $hoy->diffInDays($grupo->fecha_inicio)];
        }

        $fin = $calendario->finAjustado();

        if ($grupo->estado !== 'en_curso' || $fin === null) {
            return null;
        }

        $semanas = max(1, (int) ceil($grupo->fecha_inicio->diffInDays($fin) / 7));
        $semana = min($semanas, max(1, (int) floor($grupo->fecha_inicio->diffInDays($hoy) / 7) + 1));

        return ['semana' => $semana, 'semanas' => $semanas, 'porcentaje' => (int) round(100 * $semana / $semanas)];
    }

    /**
     * Each module of the calendar with how many active alumnos have its grade and their average.
     *
     * @param  array<int, array<string, mixed>>  $modulos
     * @param  Collection<int, Inscripcion>  $activas
     * @return array<int, array<string, mixed>>
     */
    private function conCalificaciones(array $modulos, Collection $activas): array
    {
        return collect($modulos)->map(function (array $modulo) use ($activas) {
            $finales = $activas
                ->map(fn (Inscripcion $inscripcion) => $inscripcion->calificaciones->firstWhere('curso_modulo_id', $modulo['id'])?->final())
                ->filter(fn ($final) => $final !== null);

            return [
                ...$modulo,
                'calificadas' => $finales->count(),
                'alumnos' => $activas->count(),
                'promedio' => $finales->isEmpty() ? null : round($finales->avg(), 1),
            ];
        })->all();
    }

    /**
     * Schedule fields shared by the listing and the detail page.
     *
     * @return array<string, mixed>
     */
    private function horario(Grupo $grupo): array
    {
        return [
            'turno' => $grupo->turno,
            'dias' => $grupo->dias,
            'hora_inicio' => $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5) : null,
            'hora_fin' => $grupo->hora_fin ? substr($grupo->hora_fin, 0, 5) : null,
        ];
    }
}
