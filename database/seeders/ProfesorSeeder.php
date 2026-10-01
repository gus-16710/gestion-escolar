<?php

namespace Database\Seeders;

use App\Models\Profesor;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProfesorSeeder extends Seeder
{
    /**
     * Seed the school's teachers, each with their own login account.
     *
     * Nicolás is also the director: this is his second account, used to take attendance in his grupos.
     * Surnames, birth dates and phones are placeholders.
     */
    public function run(): void
    {
        $profesores = [
            'nicolas@example.com' => [
                'nombre' => 'Nicolás',
                'apellido_paterno' => 'Ramírez',
                'apellido_materno' => 'Ortega',
                'fecha_nacimiento' => '1978-05-14',
                'telefono' => '2281234567',
                'especialidad' => 'Informática',
            ],
            'beatriz@example.com' => [
                'nombre' => 'Beatriz',
                'apellido_paterno' => 'Morales',
                'apellido_materno' => 'Cruz',
                'fecha_nacimiento' => '1985-09-22',
                'telefono' => '2281234568',
                'especialidad' => 'Estilismo y Barbería',
            ],
            'eduardo@example.com' => [
                'nombre' => 'Eduardo',
                'apellido_paterno' => 'Sánchez',
                'apellido_materno' => 'Luna',
                'fecha_nacimiento' => '1982-02-03',
                'telefono' => '2281234569',
                'especialidad' => 'Enfermería',
            ],
            'lupita@example.com' => [
                'nombre' => 'Guadalupe',
                'apellido_paterno' => 'Torres',
                'apellido_materno' => 'Vázquez',
                'fecha_nacimiento' => '1990-12-12',
                'telefono' => '2281234570',
                'especialidad' => 'Inglés',
            ],
        ];

        foreach ($profesores as $email => $ficha) {
            $nombre = "{$ficha['nombre']} {$ficha['apellido_paterno']} {$ficha['apellido_materno']}";

            $user = User::firstOrCreate(['email' => $email], [
                'name' => $nombre,
                'password' => 'password',
                'email_verified_at' => now(),
            ]);
            $user->update(['name' => $nombre]);
            $user->assignRole('Profesor');

            Profesor::updateOrCreate(['user_id' => $user->id], [...$ficha, 'email' => $email, 'activo' => true]);
        }
    }
}
