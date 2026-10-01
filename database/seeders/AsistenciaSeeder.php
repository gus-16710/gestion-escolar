<?php

namespace Database\Seeders;

use App\Models\Asistencia;
use App\Models\Grupo;
use App\Models\Inscripcion;
use Faker\Factory as Faker;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class AsistenciaSeeder extends Seeder
{
    /**
     * Alumnos with poor attendance (below the 80% risk threshold), picked by position in their grupo.
     *
     * @var array<string, int>
     */
    public const EN_RIESGO = [
        'ING-RL-2026-A' => 3,
        'INF-RL-2026-A' => 5,
        'EST-RL-2026-A' => 4,
    ];

    /**
     * This grupo's latest class has no roll call yet, so it shows up as a pending list.
     */
    private const LISTA_PENDIENTE = 'ENF-RL-2026-A';

    private const JUSTIFICACIONES = ['Cita médica', 'Enfermedad', 'Asunto familiar', 'Trámite personal'];

    /**
     * Seed the roll calls of every in-progress grupo, from its first class until yesterday.
     *
     * Re-running upserts the same rows (unique inscripcion + fecha) and adds the classes held since.
     */
    public function run(): void
    {
        $faker = Faker::create('es_ES');
        $faker->seed(2027);

        $grupos = Grupo::with(['profesor', 'inscripciones' => fn ($query) => $query->orderBy('id')])
            ->where('estado', 'en_curso')
            ->orderBy('clave')
            ->get();

        foreach ($grupos as $grupo) {
            $clases = $this->clases($grupo);

            if ($grupo->clave === self::LISTA_PENDIENTE) {
                $clases->pop();
            }

            $filas = [];

            foreach ($grupo->inscripciones->values() as $posicion => $inscripcion) {
                $enRiesgo = (self::EN_RIESGO[$grupo->clave] ?? null) === $posicion;
                $faltas = 0;

                foreach ($clases->values() as $indice => $fecha) {
                    if ($inscripcion->estado === 'baja' && $fecha->gt($inscripcion->fecha_baja)) {
                        break;
                    }

                    // At-risk alumnos miss one class in three (~67% attendance).
                    $estado = $enRiesgo
                        ? ($indice % 3 === 1 ? 'falta' : $faker->randomElement(['presente', 'presente', 'retardo']))
                        : $faker->randomElement([...array_fill(0, 17, 'presente'), 'retardo', 'retardo', 'falta', 'justificada']);

                    // Keep regular alumnos comfortably above the threshold.
                    if (! $enRiesgo && $estado === 'falta' && ++$faltas > 2) {
                        $estado = 'presente';
                    }

                    $filas[] = [
                        'inscripcion_id' => $inscripcion->id,
                        'fecha' => $fecha->toDateString(),
                        'estado' => $estado,
                        'observaciones' => $estado === 'justificada' ? $faker->randomElement(self::JUSTIFICACIONES) : null,
                        'registrado_por' => $grupo->profesor?->user_id,
                        'created_at' => $fecha->copy()->setTimeFromTimeString($grupo->hora_fin),
                        'updated_at' => $fecha->copy()->setTimeFromTimeString($grupo->hora_fin),
                    ];
                }
            }

            Asistencia::upsert($filas, ['inscripcion_id', 'fecha'], ['estado', 'observaciones', 'registrado_por', 'updated_at']);
        }
    }

    /**
     * The grupo's class dates (its `dias` of the week) from fecha_inicio until yesterday.
     *
     * @return Collection<int, Carbon>
     */
    private function clases(Grupo $grupo): Collection
    {
        $dias = array_map(fn (string $dia) => array_search($dia, Grupo::DIAS, true) + 1, explode(',', (string) $grupo->dias));
        $clases = collect();

        for ($fecha = Carbon::parse($grupo->fecha_inicio)->startOfDay(); $fecha->lt(today()); $fecha->addDay()) {
            if (in_array($fecha->dayOfWeekIso, $dias, true)) {
                $clases->push($fecha->copy());
            }
        }

        return $clases;
    }
}
