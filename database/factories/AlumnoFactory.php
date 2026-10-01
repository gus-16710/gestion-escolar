<?php

namespace Database\Factories;

use App\Models\Alumno;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Alumno>
 */
class AlumnoFactory extends Factory
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
            'matricula' => fake()->unique()->numerify('XX-'.now()->year.'-####'),
            'nombre' => fake('es_ES')->firstName(),
            'apellido_paterno' => fake('es_ES')->lastName(),
            'apellido_materno' => fake('es_ES')->lastName(),
            'fecha_nacimiento' => fake()->dateTimeBetween('-45 years', '-15 years'),
            'genero' => fake()->randomElement(['masculino', 'femenino']),
            'telefono' => fake()->numerify('##########'),
            'email' => fake()->boolean(70) ? fake()->unique()->safeEmail() : null,
            'direccion' => fake('es_ES')->streetAddress(),
            'contacto_emergencia_nombre' => fake('es_ES')->name(),
            'contacto_emergencia_telefono' => fake()->numerify('##########'),
            'activo' => true,
        ];
    }
}
