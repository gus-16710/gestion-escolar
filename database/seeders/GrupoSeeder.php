<?php

namespace Database\Seeders;

use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Plantel;
use App\Models\Profesor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class GrupoSeeder extends Seeder
{
    private const CUPO = 10;

    /**
     * Seed the real schedule: Rafael Lucio's grupos (running since June 2026) and
     * Tlacolulan's (planned, opening on 24 October 2026).
     *
     * fecha_fin = fecha_inicio + the curso's duration. Re-running updates each grupo in place.
     */
    public function run(): void
    {
        $grupos = [
            // Rafael Lucio: Friday afternoon and Sunday.
            ['RL', 'ING', 'lupita@example.com', 'vespertino', 'Vie', '15:00', '18:00', '2026-06-19', 'en_curso'],
            ['RL', 'BAR', 'beatriz@example.com', 'dominical', 'Dom', '09:00', '12:00', '2026-06-21', 'en_curso'],
            ['RL', 'ENF', 'eduardo@example.com', 'dominical', 'Dom', '09:00', '12:00', '2026-06-21', 'en_curso'],
            ['RL', 'INF', 'nicolas@example.com', 'dominical', 'Dom', '09:00', '12:00', '2026-06-21', 'en_curso'],
            ['RL', 'EST', 'beatriz@example.com', 'dominical', 'Dom', '12:30', '15:30', '2026-06-21', 'en_curso'],
            // Tlacolulan: Saturday, opening on 24 October.
            ['TL', 'ING', 'lupita@example.com', 'sabatino', 'Sáb', '09:00', '12:00', '2026-10-24', 'planeado'],
            ['TL', 'BAR', 'beatriz@example.com', 'sabatino', 'Sáb', '09:00', '12:00', '2026-10-24', 'planeado'],
            ['TL', 'ENF', 'eduardo@example.com', 'sabatino', 'Sáb', '09:00', '12:00', '2026-10-24', 'planeado'],
            ['TL', 'INF', 'nicolas@example.com', 'sabatino', 'Sáb', '09:00', '12:00', '2026-10-24', 'planeado'],
            ['TL', 'EST', 'beatriz@example.com', 'sabatino', 'Sáb', '12:30', '15:30', '2026-10-24', 'planeado'],
        ];

        foreach ($grupos as [$plantelClave, $cursoClave, $profesorEmail, $turno, $dias, $horaInicio, $horaFin, $inicio, $estado]) {
            $plantel = Plantel::where('clave', $plantelClave)->firstOrFail();
            $curso = Curso::where('clave', $cursoClave)->firstOrFail();
            $fechaInicio = Carbon::parse($inicio);

            // whereDate: the date cast stores a time part on SQLite (tests).
            $grupo = Grupo::where('plantel_id', $plantel->id)
                ->where('curso_id', $curso->id)
                ->whereDate('fecha_inicio', $fechaInicio)
                ->first()
                ?? new Grupo([
                    'plantel_id' => $plantel->id,
                    'curso_id' => $curso->id,
                    'clave' => Grupo::siguienteClave($curso, $plantel, $fechaInicio->year),
                    'fecha_inicio' => $fechaInicio->toDateString(),
                ]);

            $grupo->fill([
                'profesor_id' => Profesor::where('email', $profesorEmail)->value('id'),
                'turno' => $turno,
                'dias' => $dias,
                'hora_inicio' => $horaInicio,
                'hora_fin' => $horaFin,
                'fecha_fin' => $curso->duracion_semanas ? $fechaInicio->copy()->addWeeks($curso->duracion_semanas)->toDateString() : null,
                'cupo' => self::CUPO,
                'estado' => $estado,
            ])->save();
        }
    }
}
