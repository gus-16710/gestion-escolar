<?php

namespace Database\Factories;

use App\Models\Profesor;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Profesor>
 */
class ProfesorFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'nombre' => fake('es_ES')->firstName(),
            'apellido_paterno' => fake('es_ES')->lastName(),
            'apellido_materno' => fake('es_ES')->lastName(),
            'fecha_nacimiento' => fake()->dateTimeBetween('-60 years', '-22 years'),
            'telefono' => fake()->numerify('##########'),
            'email' => fake()->unique()->safeEmail(),
            'especialidad' => fake('es_ES')->jobTitle(),
            'activo' => true,
        ];
    }
}
