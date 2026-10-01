<?php

namespace Database\Seeders;

use App\Models\Plantel;
use Illuminate\Database\Seeder;

class PlantelSeeder extends Seeder
{
    /**
     * Seed the school's planteles. Re-running it refreshes their data.
     */
    public function run(): void
    {
        Plantel::updateOrCreate(['clave' => 'RL'], [
            'nombre' => 'CICCIS Rafael Lucio',
            'calle' => 'División del Norte',
            'numero_exterior' => '101',
            'colonia' => 'Centro',
            'codigo_postal' => '91315',
            'localidad' => 'Rafael Lucio',
            'municipio' => 'Rafael Lucio',
            'estado' => 'Veracruz',
            'activo' => true,
        ]);

        Plantel::updateOrCreate(['clave' => 'TL'], [
            'nombre' => 'CICCIS Tlacolulan',
            'calle' => 'Hidalgo esq. Matamoros',
            'numero_exterior' => '90',
            'colonia' => 'Centro',
            'codigo_postal' => '91350',
            'localidad' => 'Tlacolulan',
            'municipio' => 'Tlacolulan',
            'estado' => 'Veracruz',
            'activo' => true,
        ]);
    }
}
