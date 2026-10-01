<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admins can view the permissions list', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->get('/admin/permissions')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/permissions/index')
            ->where('permissions', fn ($permisos) => collect($permisos)->contains('manage directors'))
            ->where('roles', function ($roles) {
                $director = collect($roles)->firstWhere('name', 'Director');

                return collect($roles)->pluck('name')->take(4)->all() === ['Admin', 'Director', 'Profesor', 'Alumno']
                    && collect($director['permissions'])->contains('manage groups')
                    && ! collect($director['permissions'])->contains('view users');
            }));
});

test('non-admins cannot view the permissions list', function () {
    $user = User::factory()->create();
    $user->assignRole('Profesor');

    $this->actingAs($user)->get('/admin/permissions')->assertForbidden();
});

test('guests are redirected to the login page', function () {
    $this->get('/admin/permissions')->assertRedirect('/login');
});
