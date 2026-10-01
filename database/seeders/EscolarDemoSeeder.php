<?php

namespace Database\Seeders;

use App\Models\Alumno;
use App\Models\Asistencia;
use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Illuminate\Database\Seeder;

class EscolarDemoSeeder extends Seeder
{
    /**
     * Seed a demo group at San Miguel with a teacher, enrolled students and attendance.
     */
    public function run(): void
    {
        $sanMiguel = Plantel::where('clave', 'SM')->firstOrFail();
        $admin = User::where('email', 'admin@example.com')->firstOrFail();

        User::where('email', 'director@example.com')->firstOrFail()
            ->planteles()->syncWithoutDetaching([$sanMiguel->id]);

        $profesor = Profesor::factory()->create([
            'user_id' => User::where('email', 'profesor@example.com')->value('id'),
            'nombre' => 'Profesor',
            'apellido_paterno' => 'Demo',
            'apellido_materno' => null,
            'email' => 'profesor@example.com',
            'especialidad' => 'Barbería',
        ]);

        $grupo = Grupo::factory()->create([
            'plantel_id' => $sanMiguel->id,
            'curso_id' => Curso::where('clave', 'BAR')->value('id'),
            'profesor_id' => $profesor->id,
            'clave' => 'BAR-SM-'.now()->year.'-A',
            'turno' => 'sabatino',
            'dias' => 'Sáb',
            'hora_inicio' => '09:00',
            'hora_fin' => '14:00',
        ]);

        $alumnos = collect([
            Alumno::factory()->create([
                'matricula' => Alumno::siguienteMatricula(),
                'user_id' => User::where('email', 'alumno@example.com')->value('id'),
                'nombre' => 'Alumno',
                'apellido_paterno' => 'Demo',
                'apellido_materno' => null,
                'email' => 'alumno@example.com',
            ]),
        ]);

        foreach (range(1, 9) as $i) {
            $alumnos->push(Alumno::factory()->create(['matricula' => Alumno::siguienteMatricula()]));
        }

        $sabados = collect(range(1, 3))->map(fn (int $semanas) => now()->startOfWeek()->subWeeks($semanas)->next('Saturday'));

        foreach ($alumnos as $alumno) {
            $inscripcion = Inscripcion::create([
                'alumno_id' => $alumno->id,
                'grupo_id' => $grupo->id,
                'fecha_inscripcion' => $grupo->fecha_inicio,
                'estado' => 'activo',
                'inscrito_por' => $admin->id,
            ]);

            foreach ($sabados as $fecha) {
                Asistencia::create([
                    'inscripcion_id' => $inscripcion->id,
                    'fecha' => $fecha->toDateString(),
                    'estado' => fake()->randomElement(['presente', 'presente', 'presente', 'retardo', 'falta']),
                    'registrado_por' => $profesor->user_id,
                ]);
            }
        }
    }
}
