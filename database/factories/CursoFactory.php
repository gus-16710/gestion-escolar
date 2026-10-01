<?php

namespace Database\Factories;

use App\Models\Curso;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Curso>
 */
class CursoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nombre' => 'Curso '.fake()->unique()->words(2, true),
            'clave' => strtoupper(fake()->unique()->lexify('???')),
            'descripcion' => fake('es_ES')->sentence(),
            'duracion_semanas' => fake()->randomElement([12, 24, 36, 48]),
            'activo' => true,
        ];
    }
}
