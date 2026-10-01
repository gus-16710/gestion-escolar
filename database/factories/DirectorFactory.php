<?php

namespace Database\Factories;

use App\Models\Director;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Director>
 */
class DirectorFactory extends Factory
{
    /**
     * Define the model's default state. A director always comes with its account.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $email = fake()->unique()->safeEmail();

        return [
            'user_id' => User::factory()->state(['email' => $email]),
            'nombre' => fake('es_ES')->firstName(),
            'apellido_paterno' => fake('es_ES')->lastName(),
            'apellido_materno' => fake('es_ES')->lastName(),
            'fecha_nacimiento' => fake()->dateTimeBetween('-65 years', '-28 years'),
            'telefono' => fake()->numerify('##########'),
            'email' => $email,
            'activo' => true,
        ];
    }

    /**
     * Give the account the Director role (needs the roles seeded).
     */
    public function configure(): static
    {
        return $this->afterCreating(fn (Director $director) => $director->user->assignRole('Director'));
    }
}
