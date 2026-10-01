<?php

namespace Database\Seeders;

use App\Models\Curso;
use App\Models\Plantel;
use Illuminate\Database\Seeder;

class CursoSeeder extends Seeder
{
    /**
     * Seed the course catalog, offered at every plantel. Re-running it refreshes the catalog.
     *
     * Durations are the official ones in months converted to weeks (1 month ≈ 4.35 weeks).
     */
    public function run(): void
    {
        $cursos = [
            'EST' => [
                'nombre' => 'Alto Estilismo Profesional',
                'descripcion' => 'Formación integral en corte, peinado, colorimetría, tratamientos capilares y maquillaje para desempeñarse como estilista profesional o emprender su propio salón.',
                'duracion_semanas' => 78, // 18 meses
            ],
            'ENF' => [
                'nombre' => 'Auxiliar de Enfermería',
                'descripcion' => 'Preparación en cuidados básicos del paciente, primeros auxilios, signos vitales y apoyo al personal de salud en hospitales, clínicas y atención domiciliaria.',
                'duracion_semanas' => 78, // 18 meses
            ],
            'ING' => [
                'nombre' => 'Inglés',
                'descripcion' => 'Desarrollo de las habilidades de comprensión, expresión oral y escrita en inglés, desde nivel básico hasta intermedio, para uso académico y laboral.',
                'duracion_semanas' => 65, // 15 meses
            ],
            'BAR' => [
                'nombre' => 'Barbería',
                'descripcion' => 'Técnicas de corte clásico y moderno para caballero, diseño y arreglo de barba, afeitado tradicional y atención al cliente para trabajar o abrir una barbería.',
                'duracion_semanas' => 35, // 8 meses
            ],
            'INF' => [
                'nombre' => 'Informática Administrativa',
                'descripcion' => 'Manejo de la computadora y de herramientas de oficina (procesador de textos, hojas de cálculo, presentaciones), internet y control administrativo para el trabajo en oficina.',
                'duracion_semanas' => 52, // 12 meses
            ],
        ];

        foreach ($cursos as $clave => $datos) {
            Curso::updateOrCreate(['clave' => $clave], [...$datos, 'activo' => true]);
        }

        $catalogo = Curso::pluck('id');

        foreach (Plantel::all() as $plantel) {
            $plantel->cursos()->syncWithoutDetaching($catalogo);
        }
    }
}
