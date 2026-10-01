<?php

namespace Database\Factories;

use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Plantel;
use App\Models\Profesor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Grupo>
 */
class GrupoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'plantel_id' => Plantel::factory(),
            'curso_id' => Curso::factory(),
            'profesor_id' => Profesor::factory(),
            'clave' => strtoupper(fake()->unique()->bothify('GRP-####-?')),
            'turno' => fake()->randomElement(['matutino', 'vespertino', 'sabatino', 'dominical']),
            'dias' => 'Lun,Mié,Vie',
            'hora_inicio' => '09:00',
            'hora_fin' => '11:00',
            'fecha_inicio' => now()->startOfMonth(),
            'fecha_fin' => now()->startOfMonth()->addMonths(6),
            'cupo' => 20,
            'estado' => 'en_curso',
        ];
    }
}
