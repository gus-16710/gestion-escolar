<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

test('the app runs in Spanish', function () {
    expect(app()->getLocale())->toBe('es');
});

test('validation errors are shown in Spanish with readable field names', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/planteles', ['nombre' => '', 'codigo_postal' => '12'])
        ->assertSessionHasErrors([
            'nombre' => 'El campo nombre es obligatorio.',
            'codigo_postal' => 'El campo código postal debe tener 5 dígitos.',
        ]);

    $this->actingAs($admin)
        ->post('/grupos', ['plantel_id' => ''])
        ->assertSessionHasErrors(['plantel_id' => 'El campo plantel es obligatorio.']);
});

test('failed logins are reported in Spanish', function () {
    $user = User::factory()->create();

    $this->post('/login', ['email' => $user->email, 'password' => 'incorrecta'])
        ->assertSessionHasErrors(['email' => 'Estas credenciales no coinciden con nuestros registros.']);
});
