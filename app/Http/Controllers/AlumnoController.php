<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ManagesLoginAccounts;
use App\Http\Controllers\Concerns\ManagesPhotos;
use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Support\Calificaciones\Boleta;
use App\Support\Dashboard\ResumenEscolar;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AlumnoController extends Controller
{
    use AuthorizesRequests, ManagesLoginAccounts, ManagesPhotos;

    /** List tabs: enrolled in a visible grupo, without any active enrollment, at risk somewhere, or marked inactive. */
    private const SITUACIONES = ['inscritos', 'sin_grupo', 'en_riesgo', 'inactivos'];

    /**
     * Display a listing of alumnos.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Alumno::class);

        $perPage = (int) $request->integer('per_page', 10);

        if (! in_array($perPage, [10, 15, 20], true)) {
            $perPage = 10;
        }

        $search = trim((string) $request->string('search'));
        $plantelId = $request->integer('plantel_id') ?: null;
        $cursoId = $request->integer('curso_id') ?: null;
        $situacion = in_array($request->string('situacion')->toString(), self::SITUACIONES, true) ? $request->string('situacion')->toString() : null;

        $user = $request->user();

        // Active enrollments in grupos this user can see (their planteles, or the ones a profesor teaches), narrowed by the filters.
        $inscripcionesVisibles = fn ($query) => $query
            ->where('inscripciones.estado', 'activo')
            ->whereHas('grupo', fn ($query) => $query
                ->visiblePara($user)
                ->when($plantelId, fn ($query) => $query->where('plantel_id', $plantelId))
                ->when($cursoId, fn ($query) => $query->where('curso_id', $cursoId)));

        // Visibility, search, plantel and curso; the situación tab is applied on top so every tab can show its count.
        $filtrados = fn () => Alumno::query()
            ->visiblePara($user)
            ->when($plantelId || $cursoId, fn ($query) => $query->whereHas('inscripciones', $inscripcionesVisibles))
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search) {
                $query->where('matricula', 'like', "%{$search}%")
                    ->orWhere('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido_paterno', 'like', "%{$search}%")
                    ->orWhere('apellido_materno', 'like', "%{$search}%")
                    ->orWhere('curp', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }));

        $porSituacion = fn ($query, ?string $situacion) => match ($situacion) {
            'inscritos' => $query->where('activo', true)->whereHas('inscripciones', $inscripcionesVisibles),
            'sin_grupo' => $query->where('activo', true)->whereDoesntHave('inscripciones', fn ($query) => $query->where('estado', 'activo')),
            'en_riesgo' => $query->whereHas('inscripciones', fn ($query) => $inscripcionesVisibles($query)->enRiesgo()),
            'inactivos' => $query->where('activo', false),
            default => $query,
        };

        $alumnos = $porSituacion($filtrados(), $situacion)
            ->with(['inscripciones' => fn ($query) => $inscripcionesVisibles($query)
                ->with('grupo:id,clave,curso_id,plantel_id,estado', 'grupo.curso:id,nombre,clave', 'grupo.plantel:id,nombre,clave')
                ->withCount([
                    'asistencias as total_registros',
                    'asistencias as faltas' => fn ($query) => $query->where('estado', 'falta'),
                ])])
            ->orderByDesc('activo')
            ->orderBy('apellido_paterno')
            ->orderBy('apellido_materno')
            ->orderBy('nombre')
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn (Alumno $alumno) => [
                'id' => $alumno->id,
                'matricula' => $alumno->matricula,
                'nombre_completo' => $alumno->nombre_completo,
                'foto_url' => $alumno->fotoUrl(),
                'telefono' => $alumno->telefono,
                'email' => $alumno->email,
                'activo' => $alumno->activo,
                'tiene_cuenta' => $alumno->user_id !== null,
                'cursos' => $alumno->inscripciones
                    ->sortBy(fn (Inscripcion $inscripcion) => $inscripcion->grupo->curso->nombre)
                    ->values()
                    ->map(fn (Inscripcion $inscripcion) => $this->resumenInscripcion($inscripcion)),
            ]);

        return Inertia::render('alumnos/index', [
            'alumnos' => $alumnos,
            'conteos' => collect([null, ...self::SITUACIONES])
                ->mapWithKeys(fn (?string $valor) => [$valor ?? 'todos' => $porSituacion($filtrados(), $valor)->count()]),
            'planteles' => Plantel::alcanceDe($user)
                ->when(! $user->can('manage students'), fn ($query) => $query->whereHas('grupos', fn ($query) => $query->visiblePara($user)))
                ->orderBy('nombre')->get(['id', 'nombre']),
            'cursos' => Curso::whereHas('grupos', fn ($query) => $query->visiblePara($user))->orderBy('nombre')->get(['id', 'nombre']),
            'filters' => ['search' => $search, 'plantel_id' => $plantelId, 'curso_id' => $cursoId, 'situacion' => $situacion],
            'perPage' => $perPage,
            'canManage' => $user->can('manage students'),
        ]);
    }

    /**
     * One enrollment as the list and the edit page show it: grupo, curso, plantel and the alumno's attendance there.
     *
     * @return array<string, mixed>
     */
    private function resumenInscripcion(Inscripcion $inscripcion): array
    {
        $porcentaje = Asistencia::porcentaje($inscripcion->total_registros, $inscripcion->faltas);

        return [
            'inscripcion_id' => $inscripcion->id,
            'grupo_id' => $inscripcion->grupo_id,
            'grupo_clave' => $inscripcion->grupo->clave,
            'grupo_estado' => $inscripcion->grupo->estado,
            'curso' => $inscripcion->grupo->curso->nombre,
            'curso_clave' => $inscripcion->grupo->curso->clave,
            'plantel' => $inscripcion->grupo->plantel->nombre,
            'plantel_clave' => $inscripcion->grupo->plantel->clave,
            'asistencia' => [
                'porcentaje' => $porcentaje,
                'registros' => $inscripcion->total_registros,
                'faltas' => $inscripcion->faltas,
                'en_riesgo' => $inscripcion->estado === 'activo'
                    && $inscripcion->grupo->estado === 'en_curso'
                    && $inscripcion->total_registros >= ResumenEscolar::MIN_REGISTROS_RIESGO
                    && $porcentaje < ResumenEscolar::UMBRAL_RIESGO,
            ],
        ];
    }

    /**
     * The alumno's report card in one enrollment: each module of the study plan with its grade, and the averages.
     *
     * @return array<string, mixed>
     */
    private function boleta(Inscripcion $inscripcion): array
    {
        $modulos = $inscripcion->grupo->curso->modulos;
        $boleta = Boleta::de($modulos, $inscripcion->calificaciones);

        return [
            ...$boleta,
            'modulos' => collect($boleta['modulos'])->map(fn (array $fila, int $indice) => [
                ...$fila,
                'orden' => $modulos[$indice]->orden,
                'nombre' => $modulos[$indice]->nombre,
            ])->all(),
        ];
    }

    /**
     * Show the form for registering a new alumno.
     */
    public function create(): Response
    {
        $this->authorize('create', Alumno::class);

        return Inertia::render('alumnos/create', [
            // Only a preview: the number is assigned (under a lock) when saving.
            'matriculaPrevista' => Alumno::siguienteMatricula(),
        ]);
    }

    /**
     * Store a newly registered alumno with a generated matrícula, optionally with a login account.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Alumno::class);

        $validated = $this->validated($request);

        DB::transaction(function () use ($request, $validated) {
            $alumno = new Alumno($validated);
            $alumno->matricula = Alumno::siguienteMatricula();
            $this->applyPhoto($request, $alumno, 'alumnos');
            $this->syncAccount($alumno, $validated, 'Alumno');
            $alumno->save();
        });

        return to_route('alumnos.index');
    }

    /**
     * Show the form for editing the given alumno.
     */
    public function edit(Request $request, Alumno $alumno): Response
    {
        $this->authorize('update', $alumno);

        // Every enrollment the user can see, current first, with the alumno's attendance in each.
        $inscripciones = $alumno->inscripciones()
            ->whereHas('grupo', fn ($query) => $query->visiblePara($request->user()))
            ->with('grupo:id,clave,curso_id,plantel_id,estado', 'grupo.curso:id,nombre,clave', 'grupo.curso.modulos', 'grupo.plantel:id,nombre,clave', 'calificaciones')
            ->withCount([
                'asistencias as total_registros',
                'asistencias as faltas' => fn ($query) => $query->where('estado', 'falta'),
            ])
            ->orderByRaw("case estado when 'activo' then 0 else 1 end")
            ->orderByDesc('fecha_inscripcion')
            ->get();

        $reportables = $inscripciones->filter(fn (Inscripcion $inscripcion) => $request->user()->can('report', $inscripcion->grupo));

        return Inertia::render('alumnos/edit', [
            'alumno' => [
                'id' => $alumno->id,
                ...$alumno->only([
                    'matricula',
                    'nombre',
                    'apellido_paterno',
                    'apellido_materno',
                    'curp',
                    'genero',
                    'telefono',
                    'email',
                    'direccion',
                    'contacto_emergencia_nombre',
                    'contacto_emergencia_telefono',
                    'activo',
                ]),
                'fecha_nacimiento' => $alumno->fecha_nacimiento?->format('Y-m-d'),
                'foto_url' => $alumno->fotoUrl(),
                'tiene_cuenta' => $alumno->user_id !== null,
                'registrado' => $alumno->created_at?->format('Y-m-d'),
            ],
            'inscripciones' => $inscripciones->map(fn (Inscripcion $inscripcion) => [
                ...$this->resumenInscripcion($inscripcion),
                'estado' => $inscripcion->estado,
                'fecha_inscripcion' => $inscripcion->fecha_inscripcion?->format('Y-m-d'),
                'fecha_baja' => $inscripcion->fecha_baja?->format('Y-m-d'),
                'promedio_final' => $inscripcion->promedio_final,
                'fecha_cierre' => $inscripcion->fecha_cierre?->format('Y-m-d'),
                'calificaciones' => $this->boleta($inscripcion),
                'puede_ver_calificaciones' => $request->user()->can('viewGrades', $inscripcion->grupo),
                // Boleta / constancia, for whoever prints reports at its plantel.
                'documento' => $reportables->contains($inscripcion) ? ReporteController::inscripcionParaDocumento($inscripcion) : null,
            ]),
            'emision' => $reportables->isEmpty() ? null : ReporteController::datosEmision($reportables->map(fn (Inscripcion $inscripcion) => $inscripcion->grupo->plantel_id)->all()),
        ]);
    }

    /**
     * Update the given alumno and keep their login account in sync.
     */
    public function update(Request $request, Alumno $alumno): RedirectResponse
    {
        $this->authorize('update', $alumno);

        $validated = $this->validated($request, $alumno);
        $fotoAnterior = $alumno->foto;

        DB::transaction(function () use ($request, $alumno, $validated) {
            $alumno->fill($validated);
            $this->applyPhoto($request, $alumno, 'alumnos');
            $this->syncAccount($alumno, $validated, 'Alumno');
            $alumno->save();
        });

        $this->deleteReplacedPhoto($fotoAnterior, $alumno);

        return to_route('alumnos.index');
    }

    /**
     * Remove the given alumno.
     */
    public function destroy(Alumno $alumno): RedirectResponse
    {
        $this->authorize('delete', $alumno);

        $inscripcionesActivas = $alumno->inscripciones()->where('estado', 'activo')->count();

        if ($inscripcionesActivas > 0) {
            return back()->withErrors([
                'alumno' => "No puedes eliminar a este alumno: está inscrito en {$inscripcionesActivas} grupo(s). Dalo de baja de sus grupos primero.",
            ]);
        }

        DB::transaction(function () use ($alumno) {
            // The account is kept (it may hold other roles) but loses student access.
            $alumno->user?->removeRole('Alumno');
            $alumno->delete();
        });

        return to_route('alumnos.index');
    }

    /**
     * Validate the given request's alumno data.
     *
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Alumno $alumno = null): array
    {
        $request->merge(['curp' => $request->filled('curp') ? strtoupper((string) $request->input('curp')) : null]);

        return $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'apellido_paterno' => ['required', 'string', 'max:255'],
            'apellido_materno' => ['nullable', 'string', 'max:255'],
            'curp' => ['nullable', 'string', 'size:18', 'regex:/^[A-Z0-9]{18}$/', Rule::unique('alumnos', 'curp')->ignore($alumno?->id)],
            'fecha_nacimiento' => ['nullable', 'date', 'before:today'],
            'genero' => ['nullable', 'in:masculino,femenino,otro'],
            'telefono' => ['nullable', 'string', 'max:15'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'contacto_emergencia_nombre' => ['nullable', 'string', 'max:255'],
            'contacto_emergencia_telefono' => ['nullable', 'string', 'max:15'],
            'activo' => ['boolean'],
            ...$this->photoRules(),
            ...$this->accountRules($request, $alumno),
        ], $this->photoMessages());
    }
}
