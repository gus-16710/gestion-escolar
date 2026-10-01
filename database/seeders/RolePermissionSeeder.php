<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Seed roles and permissions.
     */
    public function run(): void
    {
        $permissions = [
            'manage users',
            'manage roles',
            'view users',
            'manage planteles',
            'view planteles',
            'manage directors',
            'manage teachers',
            'view teachers',
            'manage students',
            'view students',
            'manage courses',
            'view courses',
            'manage groups',
            'view groups',
            'manage grades',
            'view grades',
            'manage attendance',
            'view attendance',
            'view reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $admin->syncPermissions($permissions);

        $director = Role::firstOrCreate(['name' => 'Director']);
        $director->syncPermissions([
            'view planteles',
            'manage teachers',
            'view teachers',
            'manage students',
            'view students',
            // The course catalog and each plantel's offer are school-wide: only the Admin manages them.
            'view courses',
            'manage groups',
            'view groups',
            'view grades',
            'view attendance',
            'view reports',
        ]);

        $profesor = Role::firstOrCreate(['name' => 'Profesor']);
        $profesor->syncPermissions([
            'view students',
            'view courses',
            'view groups',
            'manage grades',
            'view grades',
            'manage attendance',
            'view attendance',
        ]);

        $alumno = Role::firstOrCreate(['name' => 'Alumno']);
        $alumno->syncPermissions([
            'view courses',
            'view grades',
            'view attendance',
        ]);
    }
}
