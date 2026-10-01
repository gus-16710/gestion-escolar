<?php

namespace App\Http\Controllers;

use App\Models\Calificacion;
use App\Models\CursoModulo;
use App\Models\DocumentoEmitido;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Support\CalendarioGrupo;
use App\Support\Calificaciones\Boleta;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Concluding a grupo: every active alumno ends as egresado (final average ≥ 6) or no acreditado,
 * with the average frozen, once every module is graded. The Admin can reopen it to correct.
 */
class CierreGrupoController extends Controller
{
    use AuthorizesRequests;

    /**
     * The review before concluding: each active alumno's final average and the result they will get.
     */
    public function show(Request $request, Grupo $grupo): Response
    {
        $this->authorize('close', $grupo);

        $grupo->load(['curso.modulos', 'plantel:id,nombre']);
        $alumnos = $this->resultados($grupo);
        $promedios = $alumnos->pluck('boleta.promedio_final')->filter(fn ($promedio) => $promedio !== null);

        return Inertia::render('grupos/cierre', [
            'grupo' => [
                'id' => $grupo->id,
                'clave' => $grupo->clave,
                'curso' => $grupo->curso->nombre,
                'curso_clave' => $grupo->curso->clave,
                'plantel' => $grupo->plantel->nombre,
                'fin' => (new CalendarioGrupo($grupo))->finAjustado()?->format('Y-m-d'),
            ],
            'alumnos' => $alumnos->values(),
            'totales' => [
                'egresados' => $alumnos->where('resultado', 'egresado')->count(),
                'no_acreditados' => $alumnos->where('resultado', 'no_acreditado')->count(),
                'incompletos' => $alumnos->where('resultado', 'incompleto')->count(),
                'promedio' => $promedios->isEmpty() ? null : round($promedios->avg(), 1),
            ],
            'hoy' => today()->toDateString(),
            'tienePlan' => $grupo->curso->modulos->isNotEmpty(),
        ]);
    }

    /**
     * Conclude the grupo: each active enrollment gets its result and frozen average.
     */
    public function store(Request $request, Grupo $grupo): RedirectResponse
    {
        $this->authorize('close', $grupo);

        DB::transaction(function () use ($request, $grupo) {
            $grupo = Grupo::whereKey($grupo->id)->lockForUpdate()->firstOrFail();
            $grupo->load('curso.modulos');

            if ($grupo->estado !== 'en_curso') {
                throw ValidationException::withMessages(['cierre' => 'Este grupo ya no está en curso.']);
            }

            if ($grupo->curso->modulos->isEmpty()) {
                throw ValidationException::withMessages(['cierre' => 'El curso no tiene plan de estudios: no hay calificaciones con qué concluir.']);
            }

            $alumnos = $this->resultados($grupo);
            $incompletos = $alumnos->where('resultado', 'incompleto');

            if ($incompletos->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'cierre' => 'Faltan calificaciones de '.$incompletos->count().' '.($incompletos->count() === 1 ? 'alumno' : 'alumnos').': '.$incompletos->pluck('nombre_completo')->join(', ', ' y ').'.',
                ]);
            }

            foreach ($alumnos as $alumno) {
                Inscripcion::whereKey($alumno['inscripcion_id'])->update([
                    'estado' => $alumno['resultado'],
                    'promedio_final' => $alumno['boleta']['promedio_final'],
                    'fecha_cierre' => today()->toDateString(),
                ]);
            }

            $grupo->update(['estado' => 'concluido', 'concluido_en' => now(), 'concluido_por' => $request->user()->id]);
        });

        return to_route('grupos.show', $grupo);
    }

    /**
     * Reopen a concluded grupo: its alumnos are enrolled again and the grupo runs again, to correct it;
     * the constancias issued to them are voided.
     */
    public function destroy(Request $request, Grupo $grupo): RedirectResponse
    {
        $this->authorize('reopen', $grupo);

        DB::transaction(function () use ($request, $grupo) {
            // A constancia says the alumno finished: once the result can change again it is no longer valid.
            DocumentoEmitido::where('tipo', 'constancia')
                ->whereNull('anulado_en')
                ->whereIn('inscripcion_id', $grupo->inscripciones()->select('id'))
                ->update(['anulado_en' => now(), 'anulado_por' => $request->user()->id, 'motivo_anulacion' => 'Grupo reabierto']);

            $grupo->inscripciones()
                ->whereIn('estado', ['egresado', 'no_acreditado'])
                ->whereNotNull('fecha_cierre')
                ->update(['estado' => 'activo', 'promedio_final' => null, 'fecha_cierre' => null]);

            $grupo->update(['estado' => 'en_curso', 'concluido_en' => null, 'concluido_por' => null]);
        });

        return to_route('grupos.show', $grupo);
    }

    /**
     * Each active enrollment with its report card and the result it gets: egresado, no_acreditado,
     * or incompleto while some module has no grade.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function resultados(Grupo $grupo): Collection
    {
        $modulos = $grupo->curso->modulos;

        return $grupo->inscripciones()
            ->where('estado', 'activo')
            ->with(['alumno' => fn ($query) => $query->withTrashed(), 'calificaciones'])
            ->get()
            ->sortBy(fn (Inscripcion $inscripcion) => $inscripcion->alumno->apellido_paterno.' '.$inscripcion->alumno->nombre)
            ->map(function (Inscripcion $inscripcion) use ($modulos) {
                $boleta = Boleta::de($modulos, $inscripcion->calificaciones);
                $calificados = $inscripcion->calificaciones->pluck('curso_modulo_id');

                return [
                    'inscripcion_id' => $inscripcion->id,
                    'matricula' => $inscripcion->alumno->matricula,
                    'nombre_completo' => $inscripcion->alumno->nombre_completo,
                    'foto_url' => $inscripcion->alumno->fotoUrl(),
                    'boleta' => $boleta,
                    'faltantes' => $modulos
                        ->reject(fn (CursoModulo $modulo) => $calificados->contains($modulo->id))
                        ->map(fn (CursoModulo $modulo) => ['id' => $modulo->id, 'orden' => $modulo->orden, 'nombre' => $modulo->nombre])
                        ->values(),
                    'resultado' => match (true) {
                        $boleta['promedio_final'] === null => 'incompleto',
                        $boleta['promedio_final'] >= Calificacion::APROBATORIA => 'egresado',
                        default => 'no_acreditado',
                    },
                ];
            })
            ->values();
    }
}
