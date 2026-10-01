<?php

namespace Database\Factories;

use App\Models\Alumno;
use App\Models\Grupo;
use App\Models\Inscripcion;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Inscripcion>
 */
class InscripcionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'alumno_id' => Alumno::factory(),
            'grupo_id' => Grupo::factory(),
            'fecha_inscripcion' => now()->toDateString(),
            'estado' => 'activo',
        ];
    }
}
