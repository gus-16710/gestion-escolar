<?php

namespace App\Http\Controllers;

use App\Models\Calificacion;
use App\Models\CursoModulo;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Support\CalendarioGrupo;
use App\Support\Calificaciones\Boleta;
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

/**
 * Grades of a grupo: the grade sheet (alumnos × modules) and the capture of one module's exam,
 * with the retake for whoever failed it.
 */
class CalificacionController extends Controller
{
    use AuthorizesRequests;

    /**
     * The grade sheet: every alumno with their grade in each module and their average.
     */
    public function index(Request $request, Grupo $grupo): Response
    {
        $this->authorize('viewGrades', $grupo);

        $grupo->load(['curso.modulos', 'plantel:id,nombre']);
        $modulos = $grupo->curso->modulos;
        $calendario = (new CalendarioGrupo($grupo))->modulos($modulos);
        $inscripciones = $this->inscripciones($grupo);

        $alumnos = $inscripciones->map(fn (Inscripcion $inscripcion) => [
            ...$this->alumno($inscripcion),
            'boleta' => Boleta::de($modulos, $inscripcion->calificaciones),
        ]);

        $activos = $alumnos->where('activa', true);
        $conPromedio = $activos->pluck('boleta.promedio_parcial')->filter(fn ($promedio) => $promedio !== null);

        return Inertia::render('calificaciones/sabana', [
            'grupo' => $this->grupo($grupo),
            'modulos' => collect($calendario)->map(function (array $modulo, int $indice) use ($alumnos, $activos) {
                $finales = $alumnos->pluck("boleta.modulos.{$indice}.final")->filter(fn ($final) => $final !== null);

                return [
                    ...$modulo,
                    'capturadas' => $activos->filter(fn (array $alumno) => $alumno['boleta']['modulos'][$indice]['final'] !== null)->count(),
                    'promedio' => $finales->isEmpty() ? null : round($finales->avg(), 1),
                    'reprobados' => $finales->filter(fn ($final) => $final < Calificacion::APROBATORIA)->count(),
                ];
            })->values(),
            'alumnos' => $alumnos->values(),
            'resumen' => [
                'promedio' => $conPromedio->isEmpty() ? null : round($conPromedio->avg(), 1),
                'activos' => $activos->count(),
                'bajo_minimo' => $conPromedio->filter(fn ($promedio) => $promedio < Calificacion::APROBATORIA)->count(),
            ],
            'aprobatoria' => Calificacion::APROBATORIA,
            'canGrade' => $request->user()->can('gradeStudents', $grupo),
        ]);
    }

    /**
     * The capture of one module: each alumno's exam grade, and the retake for whoever failed.
     */
    public function edit(Request $request, Grupo $grupo, CursoModulo $modulo): Response
    {
        $this->authorize('viewGrades', $grupo);
        abort_unless($modulo->curso_id === $grupo->curso_id, 404);

        $grupo->load(['curso.modulos', 'plantel:id,nombre']);
        $calendario = collect((new CalendarioGrupo($grupo))->modulos($grupo->curso->modulos));
        $actual = $calendario->firstWhere('id', $modulo->id);

        $inscripciones = $this->inscripciones($grupo)
            ->filter(fn (Inscripcion $inscripcion) => $inscripcion->estado === 'activo' || $inscripcion->calificaciones->contains('curso_modulo_id', $modulo->id))
            ->values();

        $registros = $inscripciones->map(fn (Inscripcion $inscripcion) => $inscripcion->calificaciones->firstWhere('curso_modulo_id', $modulo->id));
        $fechaGuardada = $registros->filter()->map(fn (Calificacion $calificacion) => $calificacion->fecha_evaluacion->toDateString())->mode()[0] ?? null;

        return Inertia::render('calificaciones/capturar', [
            'grupo' => $this->grupo($grupo),
            'modulo' => $actual,
            'modulos' => $calendario->map(fn (array $fila) => collect($fila)->only(['id', 'orden', 'nombre', 'estado']))->values(),
            'alumnos' => $inscripciones->map(function (Inscripcion $inscripcion, int $indice) use ($registros, $grupo) {
                $calificacion = $registros[$indice];

                return [
                    ...$this->alumno($inscripcion),
                    'calificacion' => $calificacion?->calificacion,
                    'recuperacion' => $calificacion?->recuperacion,
                    'fecha_recuperacion' => $calificacion?->fecha_recuperacion?->toDateString(),
                    'observaciones' => $calificacion?->observaciones,
                    'promedio_parcial' => Boleta::de($grupo->curso->modulos, $inscripcion->calificaciones)['promedio_parcial'],
                ];
            }),
            // The exam is at the end of the module: its last day, or today while it's still running.
            'fecha' => $fechaGuardada ?? min($actual['fin'], today()->toDateString()),
            'hoy' => today()->toDateString(),
            'aprobatoria' => Calificacion::APROBATORIA,
            'canGrade' => $request->user()->can('gradeStudents', $grupo) && $actual['estado'] !== 'proximo',
            'puedeCalificarGrupo' => $request->user()->can('gradeStudents', $grupo),
        ]);
    }

    /**
     * Save one module's grades: creates or corrects each row, and an emptied grade removes it.
     */
    public function update(Request $request, Grupo $grupo, CursoModulo $modulo): RedirectResponse
    {
        $this->authorize('gradeStudents', $grupo);
        abort_unless($modulo->curso_id === $grupo->curso_id, 404);

        $grupo->load('curso.modulos');
        $estado = collect((new CalendarioGrupo($grupo))->modulos($grupo->curso->modulos))->firstWhere('id', $modulo->id)['estado'];

        if ($estado === 'proximo') {
            throw ValidationException::withMessages(['fecha_evaluacion' => 'Este módulo todavía no empieza; aún no se puede calificar.']);
        }

        $calificacion = ['nullable', 'numeric', 'decimal:0,1', 'between:0,10'];

        $validated = $request->validate([
            'fecha_evaluacion' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$grupo->fecha_inicio->format('Y-m-d')],
            'registros' => ['required', 'array', 'min:1'],
            'registros.*.inscripcion_id' => ['required', 'integer', 'distinct', Rule::in($grupo->inscripciones()->pluck('id'))],
            'registros.*.calificacion' => $calificacion,
            'registros.*.recuperacion' => $calificacion,
            'registros.*.fecha_recuperacion' => ['nullable', 'required_with:registros.*.recuperacion', 'date', 'before_or_equal:today'],
            'registros.*.observaciones' => ['nullable', 'string', 'max:255'],
        ], [
            'fecha_evaluacion.before_or_equal' => 'La fecha del examen no puede ser futura.',
            'fecha_evaluacion.after_or_equal' => 'La fecha del examen no puede ser anterior al inicio del grupo.',
            'registros.*.calificacion.decimal' => 'Usa a lo más un decimal (por ejemplo 8.5).',
            'registros.*.recuperacion.decimal' => 'Usa a lo más un decimal (por ejemplo 8.5).',
            'registros.*.calificacion.between' => 'La calificación va de 0 a 10.',
            'registros.*.recuperacion.between' => 'La calificación va de 0 a 10.',
            'registros.*.fecha_recuperacion.required_with' => 'Indica la fecha de la recuperación.',
            'registros.*.fecha_recuperacion.before_or_equal' => 'La fecha de la recuperación no puede ser futura.',
        ]);

        $errores = [];

        foreach ($validated['registros'] as $indice => $registro) {
            $original = $registro['calificacion'] ?? null;

            if (($registro['recuperacion'] ?? null) === null) {
                continue;
            }

            if ($original === null || (float) $original >= Calificacion::APROBATORIA) {
                $errores["registros.{$indice}.recuperacion"] = 'Solo hay recuperación cuando el módulo se reprobó.';
            } elseif (Carbon::parse($registro['fecha_recuperacion'])->lt(Carbon::parse($validated['fecha_evaluacion']))) {
                $errores["registros.{$indice}.fecha_recuperacion"] = 'La recuperación no puede ser antes del examen.';
            }
        }

        if ($errores !== []) {
            throw ValidationException::withMessages($errores);
        }

        DB::transaction(function () use ($validated, $modulo, $request) {
            foreach ($validated['registros'] as $registro) {
                $clave = ['inscripcion_id' => $registro['inscripcion_id'], 'curso_modulo_id' => $modulo->id];

                if (($registro['calificacion'] ?? null) === null) {
                    Calificacion::where($clave)->delete();

                    continue;
                }

                $recuperacion = $registro['recuperacion'] ?? null;

                Calificacion::updateOrCreate($clave, [
                    'calificacion' => $registro['calificacion'],
                    'fecha_evaluacion' => $validated['fecha_evaluacion'],
                    'recuperacion' => $recuperacion,
                    'fecha_recuperacion' => $recuperacion === null ? null : $registro['fecha_recuperacion'],
                    'observaciones' => $registro['observaciones'] ?? null,
                    'registrado_por' => $request->user()->id,
                ]);
            }
        });

        return to_route('calificaciones.edit', [$grupo, $modulo]);
    }

    /**
     * Active enrollments plus dropped ones that already have grades, by surname.
     *
     * @return Collection<int, Inscripcion>
     */
    private function inscripciones(Grupo $grupo): Collection
    {
        return $grupo->inscripciones()
            ->with(['alumno' => fn ($query) => $query->withTrashed(), 'calificaciones'])
            ->get()
            ->filter(fn (Inscripcion $inscripcion) => $inscripcion->estado === 'activo' || $inscripcion->calificaciones->isNotEmpty())
            ->sortBy(fn (Inscripcion $inscripcion) => $inscripcion->alumno->apellido_paterno.' '.$inscripcion->alumno->nombre)
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function alumno(Inscripcion $inscripcion): array
    {
        return [
            'inscripcion_id' => $inscripcion->id,
            'alumno_id' => $inscripcion->alumno_id,
            'matricula' => $inscripcion->alumno->matricula,
            'nombre_completo' => $inscripcion->alumno->nombre_completo,
            'foto_url' => $inscripcion->alumno->fotoUrl(),
            'activa' => $inscripcion->estado === 'activo',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function grupo(Grupo $grupo): array
    {
        return [
            'id' => $grupo->id,
            'clave' => $grupo->clave,
            'curso' => $grupo->curso->nombre,
            'curso_clave' => $grupo->curso->clave,
            'plantel' => $grupo->plantel->nombre,
            'estado' => $grupo->estado,
            'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
        ];
    }
}
