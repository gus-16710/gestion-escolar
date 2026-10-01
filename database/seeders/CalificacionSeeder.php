<?php

namespace Database\Seeders;

use App\Models\Calificacion;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Support\CalendarioGrupo;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class CalificacionSeeder extends Seeder
{
    /**
     * This grupo's latest finished module is left ungraded, so it shows up as a pending grade.
     */
    private const MODULO_PENDIENTE = 'INF-RL-2026-A';

    private const NOTAS_REGULARES = [7, 7.5, 8, 8, 8.5, 8.5, 9, 9, 9.5, 10];

    private const NOTAS_EN_RIESGO = [5, 5.5, 6, 6.5, 7];

    /**
     * Seed fictitious grades for every finished module of the in-progress grupos: mostly 7–10, lower for the
     * alumnos with poor attendance (AsistenciaSeeder::EN_RIESGO), who retake their failed modules a week later.
     * Drop-outs only have the modules finished before they left.
     *
     * Re-running upserts the same rows (unique inscripcion + módulo) and grades the modules finished since.
     */
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        $faker->seed(2028);

        $grupos = Grupo::with(['profesor', 'curso.modulos', 'clasesSuspendidas', 'inscripciones' => fn ($query) => $query->orderBy('id')])
            ->where('estado', 'en_curso')
            ->orderBy('clave')
            ->get();

        foreach ($grupos as $grupo) {
            $calendario = new CalendarioGrupo($grupo);
            $terminados = collect($calendario->modulos($grupo->curso->modulos))->where('estado', 'terminado')->values();

            if ($grupo->clave === self::MODULO_PENDIENTE) {
                $terminados->pop();
            }

            $filas = [];

            foreach ($terminados as $modulo) {
                // The exam is the module's last class.
                $examen = $calendario->ultimaClaseHasta(Carbon::parse($modulo['fin'])) ?? Carbon::parse($modulo['fin']);

                foreach ($grupo->inscripciones->values() as $posicion => $inscripcion) {
                    if ($inscripcion->estado === 'baja' && $inscripcion->fecha_baja->lt($examen)) {
                        continue;
                    }

                    $enRiesgo = (AsistenciaSeeder::EN_RIESGO[$grupo->clave] ?? null) === $posicion;
                    $calificacion = $faker->randomElement($enRiesgo ? self::NOTAS_EN_RIESGO : self::NOTAS_REGULARES);
                    $fechaRecuperacion = $examen->copy()->addWeek();
                    $recupera = $calificacion < Calificacion::APROBATORIA && $fechaRecuperacion->lt(today());

                    $filas[] = [
                        'inscripcion_id' => $inscripcion->id,
                        'curso_modulo_id' => $modulo['id'],
                        'calificacion' => $calificacion,
                        'fecha_evaluacion' => $examen->toDateString(),
                        'recuperacion' => $recupera ? $faker->randomElement([6, 6.5, 7, 7.5]) : null,
                        'fecha_recuperacion' => $recupera ? $fechaRecuperacion->toDateString() : null,
                        'observaciones' => null,
                        'registrado_por' => $grupo->profesor?->user_id,
                        'created_at' => $examen->copy()->setTimeFromTimeString($grupo->hora_fin ?? '12:00'),
                        'updated_at' => $examen->copy()->setTimeFromTimeString($grupo->hora_fin ?? '12:00'),
                    ];
                }
            }

            Calificacion::upsert(
                $filas,
                ['inscripcion_id', 'curso_modulo_id'],
                ['calificacion', 'fecha_evaluacion', 'recuperacion', 'fecha_recuperacion', 'registrado_por', 'updated_at'],
            );
        }
    }
}
