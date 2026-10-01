<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admins can create a user with roles and direct permissions', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'Nuevo Usuario',
            'email' => 'nuevo@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'roles' => ['Admin'],
            'permissions' => ['manage grades'],
        ])
        ->assertRedirect(route('admin.users.index'));

    $user = User::where('email', 'nuevo@example.com')->firstOrFail();

    expect($user->hasRole('Admin'))->toBeTrue();
    expect($user->hasDirectPermission('manage grades'))->toBeTrue();
});

test('non-admins cannot create a user', function () {
    $profesor = User::factory()->create();
    $profesor->assignRole('Profesor');

    $this->actingAs($profesor)
        ->post('/admin/users', [
            'name' => 'Nuevo Usuario',
            'email' => 'nuevo@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'roles' => [],
            'permissions' => [],
        ])
        ->assertForbidden();

    expect(User::where('email', 'nuevo@example.com')->exists())->toBeFalse();
});

test('admins can update a user and change their direct permissions', function () {
    $admin = actingAsAdmin();

    $target = User::factory()->create();
    $target->assignRole('Admin');

    $this->actingAs($admin)
        ->put("/admin/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'roles' => ['Admin'],
            'permissions' => ['manage grades'],
        ])
        ->assertRedirect(route('admin.users.index'));

    expect($target->fresh()->hasDirectPermission('manage grades'))->toBeTrue();
});

test('admins can delete a user', function () {
    $admin = actingAsAdmin();

    $target = User::factory()->create();
    $target->assignRole('Profesor');

    $this->actingAs($admin)
        ->delete("/admin/users/{$target->id}")
        ->assertRedirect(route('admin.users.index'));

    expect(User::find($target->id))->toBeNull();
});

test('an admin cannot delete their own account', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->delete("/admin/users/{$admin->id}")
        ->assertSessionHasErrors('user');

    expect(User::find($admin->id))->not->toBeNull();
});
