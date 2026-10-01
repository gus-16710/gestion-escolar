<?php

namespace Database\Seeders;

use App\Models\Director;
use App\Models\Plantel;
use App\Models\User;
use Illuminate\Database\Seeder;

class DirectorSeeder extends Seeder
{
    /**
     * Seed the director: their account, record and the planteles they run.
     *
     * Nicolás also teaches Informática; his profesor record has its own account (see ProfesorSeeder).
     * Surnames, birth date and phone are placeholders.
     */
    public function run(): void
    {
        $user = User::firstOrCreate(['email' => 'director@example.com'], [
            'name' => 'Nicolás Ramírez Ortega',
            'password' => 'password',
            'email_verified_at' => now(),
        ]);
        $user->update(['name' => 'Nicolás Ramírez Ortega']);
        $user->assignRole('Director');

        $director = Director::updateOrCreate(['user_id' => $user->id], [
            'nombre' => 'Nicolás',
            'apellido_paterno' => 'Ramírez',
            'apellido_materno' => 'Ortega',
            'fecha_nacimiento' => '1978-05-14',
            'telefono' => '2281234567',
            'email' => $user->email,
            'activo' => true,
        ]);

        $director->planteles()->sync(Plantel::whereIn('clave', ['RL', 'TL'])->pluck('id'));
    }
}
