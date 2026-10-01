<?php

namespace Database\Factories;

use App\Models\Plantel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plantel>
 */
class PlantelFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $localidad = fake('es_ES')->city();

        return [
            'nombre' => "Plantel {$localidad}",
            'clave' => strtoupper(fake()->unique()->bothify('PL-###')),
            'calle' => fake('es_ES')->streetName(),
            'numero_exterior' => (string) fake()->numberBetween(1, 999),
            'numero_interior' => null,
            'colonia' => 'Centro',
            'codigo_postal' => fake()->numerify('#####'),
            'localidad' => $localidad,
            'municipio' => $localidad,
            'estado' => 'Veracruz',
            'telefono' => fake()->numerify('##########'),
            'email' => fake()->safeEmail(),
            'activo' => true,
        ];
    }

    public function inactivo(): static
    {
        return $this->state(fn (array $attributes) => ['activo' => false]);
    }
}
