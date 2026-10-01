<?php

namespace Database\Seeders;

use App\Models\Alumno;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\User;
use Faker\Factory as Faker;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AlumnoSeeder extends Seeder
{
    private const NOMBRES_MUJER = [
        'María Fernanda', 'Guadalupe', 'Ana Karen', 'Daniela', 'Valeria', 'Ximena', 'Andrea', 'Itzel', 'Karla', 'Rosa María',
        'Alejandra', 'Brenda', 'Diana Laura', 'Fátima', 'Leticia', 'Paola', 'Yesenia', 'Mariana', 'Araceli', 'Esmeralda',
    ];

    private const NOMBRES_HOMBRE = [
        'José Luis', 'Juan Carlos', 'Miguel Ángel', 'Luis Fernando', 'Jesús', 'Francisco', 'Alejandro', 'Óscar', 'Ricardo', 'Diego',
        'Jorge', 'Víctor Manuel', 'Emmanuel', 'Uriel', 'Brandon', 'Ángel', 'Martín', 'Érick', 'Iván', 'Raúl',
    ];

    private const APELLIDOS = [
        'Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez', 'Ramírez', 'Cruz',
        'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Díaz', 'Gutiérrez', 'Ruiz',
        'Mendoza', 'Aguilar', 'Ortiz', 'Castillo', 'Romero', 'Contreras', 'Landa', 'Utrera', 'Hernández', 'Colorado',
    ];

    private const CALLES = ['Hidalgo', 'Morelos', 'Juárez', 'Allende', 'Zaragoza', 'Guerrero', 'Independencia', 'Reforma', '5 de Mayo', 'Aldama'];

    /**
     * Alumnos per grupo (fictitious data). Rafael Lucio runs since June with 7–10 each, one or two
     * drop-outs and two alumnos taking both Barbería and Estilismo; Tlacolulan has 3 early sign-ups per grupo.
     *
     * @var array<string, array{activos: int, bajas?: int}>
     */
    private const GRUPOS = [
        'ING-RL-2026-A' => ['activos' => 8, 'bajas' => 1],
        'BAR-RL-2026-A' => ['activos' => 7],
        'ENF-RL-2026-A' => ['activos' => 7, 'bajas' => 1],
        'INF-RL-2026-A' => ['activos' => 10],
        'EST-RL-2026-A' => ['activos' => 6],
        'ING-TL-2026-A' => ['activos' => 3],
        'BAR-TL-2026-A' => ['activos' => 3],
        'ENF-TL-2026-A' => ['activos' => 3],
        'INF-TL-2026-A' => ['activos' => 3],
        'EST-TL-2026-A' => ['activos' => 3],
    ];

    private const MOTIVOS_BAJA = ['Motivos económicos', 'Cambio de domicilio'];

    private Generator $faker;

    private int $consecutivo = 0;

    /**
     * Seed the alumnos and their enrollments. Matrículas are fixed ({year}-0001...) and the fake data
     * comes from a seeded generator, so re-running updates the same rows instead of adding new ones.
     */
    public function run(): void
    {
        $this->faker = Faker::create('es_ES');
        $this->faker->seed(2026);

        $inscritoPor = User::where('email', 'director@example.com')->value('id');
        $grupos = Grupo::with('plantel')->get()->keyBy('clave');

        // Two alumnos take Barbería and Estilismo at Rafael Lucio; the first one has the demo login account.
        $dobles = [
            $this->alumno('RL', cuenta: 'alumno@example.com'),
            $this->alumno('RL'),
        ];

        foreach ($dobles as $alumno) {
            foreach (['BAR-RL-2026-A', 'EST-RL-2026-A'] as $clave) {
                $this->inscribir($alumno, $grupos[$clave], $inscritoPor);
            }
        }

        foreach (self::GRUPOS as $clave => $cantidad) {
            $grupo = $grupos[$clave];

            for ($i = 0; $i < $cantidad['activos']; $i++) {
                $this->inscribir($this->alumno($grupo->plantel->clave), $grupo, $inscritoPor);
            }

            for ($i = 0; $i < ($cantidad['bajas'] ?? 0); $i++) {
                $this->inscribir($this->alumno($grupo->plantel->clave), $grupo, $inscritoPor, baja: true);
            }
        }
    }

    private function alumno(string $plantelClave, ?string $cuenta = null): Alumno
    {
        $this->consecutivo++;

        $genero = $this->faker->randomElement(['femenino', 'masculino']);
        $nombre = $this->faker->randomElement($genero === 'femenino' ? self::NOMBRES_MUJER : self::NOMBRES_HOMBRE);
        $paterno = $this->faker->randomElement(self::APELLIDOS);
        $materno = $this->faker->randomElement(self::APELLIDOS);
        $localidad = $plantelClave === 'RL' ? 'Rafael Lucio' : 'Tlacolulan';
        $email = $cuenta ?? ($this->faker->boolean(60)
            ? $this->slug($nombre).'.'.$this->slug($paterno).$this->consecutivo.'@example.com'
            : null);

        $alumno = Alumno::updateOrCreate(['matricula' => sprintf('2026-%04d', $this->consecutivo)], [
            'nombre' => $nombre,
            'apellido_paterno' => $paterno,
            'apellido_materno' => $materno,
            'fecha_nacimiento' => $this->faker->dateTimeBetween('1985-01-01', '2010-12-31')->format('Y-m-d'),
            'genero' => $genero,
            'telefono' => '228'.$this->faker->numerify('#######'),
            'email' => $email,
            'direccion' => 'Calle '.$this->faker->randomElement(self::CALLES).' '.$this->faker->numberBetween(1, 250).', '.$localidad,
            'contacto_emergencia_nombre' => $this->faker->randomElement([...self::NOMBRES_MUJER, ...self::NOMBRES_HOMBRE]).' '.$paterno,
            'contacto_emergencia_telefono' => '228'.$this->faker->numerify('#######'),
            'activo' => true,
        ]);

        if ($cuenta !== null) {
            $user = User::firstOrCreate(['email' => $cuenta], [
                'name' => $alumno->nombre_completo,
                'password' => 'password',
                'email_verified_at' => now(),
            ]);
            $user->update(['name' => $alumno->nombre_completo]);
            $user->assignRole('Alumno');
            $alumno->update(['user_id' => $user->id]);
        }

        return $alumno;
    }

    private function inscribir(Alumno $alumno, Grupo $grupo, ?int $inscritoPor, bool $baja = false): void
    {
        // Enrolled in the weeks before the grupo starts, but never in the future.
        $fechaInscripcion = Carbon::parse($grupo->fecha_inicio)->subDays($this->faker->numberBetween(3, 20));
        $fechaInscripcion = $fechaInscripcion->isFuture() ? now()->subDays($this->faker->numberBetween(1, 10)) : $fechaInscripcion;

        Inscripcion::updateOrCreate(['alumno_id' => $alumno->id, 'grupo_id' => $grupo->id], [
            'fecha_inscripcion' => $fechaInscripcion->toDateString(),
            'estado' => $baja ? 'baja' : 'activo',
            'fecha_baja' => $baja ? Carbon::parse($grupo->fecha_inicio)->addWeeks($this->faker->numberBetween(4, 8))->toDateString() : null,
            'motivo_baja' => $baja ? $this->faker->randomElement(self::MOTIVOS_BAJA) : null,
            'inscrito_por' => $inscritoPor,
        ]);
    }

    private function slug(string $texto): string
    {
        return str($texto)->before(' ')->ascii()->lower()->toString();
    }
}
