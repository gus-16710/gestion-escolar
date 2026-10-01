<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed what the system needs to start: roles, permissions, the first administrator, the planteles and the course catalog.
     *
     * The school data (planteles, cursos, personas, grupos) is being rebuilt step by step;
     * each seeder is added back here once it has been reviewed.
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);

        User::firstOrCreate(['email' => 'admin@example.com'], [
            'name' => 'Admin Demo',
            'password' => 'password',
            'email_verified_at' => now(),
        ])->assignRole('Admin');

        $this->call(PlantelSeeder::class);
        $this->call(CursoSeeder::class);
        $this->call(CursoModuloSeeder::class);
        $this->call(DirectorSeeder::class);
        $this->call(ProfesorSeeder::class);
        $this->call(GrupoSeeder::class);
        $this->call(AlumnoSeeder::class);
        $this->call(AsistenciaSeeder::class);
        $this->call(CalificacionSeeder::class);
    }
}
