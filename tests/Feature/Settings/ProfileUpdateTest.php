<?php

use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get('/settings/profile');

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch('/settings/profile', [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect('/settings/profile');

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('accounts cannot be deleted from settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->delete('/settings/profile', ['password' => 'password'])->assertMethodNotAllowed();

    expect($user->fresh())->not->toBeNull();
});

test('a profesor or alumno sees the data of their record and cannot change name or email', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->create(['name' => 'Beatriz Morales', 'email' => 'beatriz@example.com']);
    $user->assignRole('Profesor');
    Profesor::factory()->create(['user_id' => $user->id, 'especialidad' => 'Barbería', 'telefono' => '2281234567']);

    $this->actingAs($user)
        ->get('/settings/profile')
        ->assertInertia(fn ($page) => $page
            ->where('cuenta.editable', false)
            ->where('cuenta.tipo', 'profesor')
            ->where('cuenta.datos', [['etiqueta' => 'Especialidad', 'valor' => 'Barbería'], ['etiqueta' => 'Teléfono', 'valor' => '2281234567']]));

    $this->patch('/settings/profile', ['name' => 'Otro', 'email' => 'otro@example.com'])->assertForbidden();

    expect($user->fresh()->only('name', 'email'))->toBe(['name' => 'Beatriz Morales', 'email' => 'beatriz@example.com']);
});

test('an administrator edits their own account even with a record', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = actingAsAdmin();
    Profesor::factory()->create(['user_id' => $admin->id]);

    $this->actingAs($admin)->get('/settings/profile')->assertInertia(fn ($page) => $page->where('cuenta.editable', true));
    $this->patch('/settings/profile', ['name' => 'Admin CICCIS', 'email' => $admin->email])->assertRedirect('/settings/profile');

    expect($admin->fresh()->name)->toBe('Admin CICCIS');
});
