<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('admins can create a role with permissions', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/admin/roles', [
            'name' => 'Auxiliar',
            'permissions' => ['view grades'],
        ])
        ->assertRedirect(route('admin.roles.index'));

    $role = Role::where('name', 'Auxiliar')->firstOrFail();
    expect($role->hasPermissionTo('view grades'))->toBeTrue();
});

test('non-admins cannot create a role', function () {
    $profesor = User::factory()->create();
    $profesor->assignRole('Profesor');

    $this->actingAs($profesor)
        ->post('/admin/roles', ['name' => 'Auxiliar', 'permissions' => []])
        ->assertForbidden();

    expect(Role::where('name', 'Auxiliar')->exists())->toBeFalse();
});

test('admins can update a role and its permissions', function () {
    $admin = actingAsAdmin();
    $role = Role::where('name', 'Profesor')->firstOrFail();

    $this->actingAs($admin)
        ->put("/admin/roles/{$role->id}", [
            'name' => 'Profesor',
            'permissions' => ['view grades'],
        ])
        ->assertRedirect(route('admin.roles.index'));

    expect($role->fresh()->hasPermissionTo('manage grades'))->toBeFalse();
    expect($role->fresh()->hasPermissionTo('view grades'))->toBeTrue();
});

test('the admin role cannot be renamed', function () {
    $admin = actingAsAdmin();
    $adminRole = Role::where('name', 'Admin')->firstOrFail();

    $this->actingAs($admin)
        ->put("/admin/roles/{$adminRole->id}", [
            'name' => 'SuperAdmin',
            'permissions' => [],
        ])
        ->assertSessionHasErrors('name');

    expect($adminRole->fresh()->name)->toBe('Admin');
});

test('the admin role cannot be deleted', function () {
    $admin = actingAsAdmin();
    $adminRole = Role::where('name', 'Admin')->firstOrFail();

    $this->actingAs($admin)
        ->delete("/admin/roles/{$adminRole->id}")
        ->assertSessionHasErrors('role');

    expect(Role::find($adminRole->id))->not->toBeNull();
});

test('a role assigned to users cannot be deleted', function () {
    $admin = actingAsAdmin();

    $target = User::factory()->create();
    $target->assignRole('Profesor');

    $role = Role::where('name', 'Profesor')->firstOrFail();

    $this->actingAs($admin)
        ->delete("/admin/roles/{$role->id}")
        ->assertSessionHasErrors('role');

    expect(Role::find($role->id))->not->toBeNull();
});

test('a custom role with no users assigned can be renamed and deleted', function () {
    $admin = actingAsAdmin();
    $role = Role::create(['name' => 'Recepción']);

    $this->actingAs($admin)
        ->put("/admin/roles/{$role->id}", ['name' => 'Recepción y caja', 'permissions' => ['view students']])
        ->assertRedirect(route('admin.roles.index'));

    expect($role->fresh()->name)->toBe('Recepción y caja');

    $this->actingAs($admin)
        ->delete("/admin/roles/{$role->id}")
        ->assertRedirect(route('admin.roles.index'));

    expect(Role::find($role->id))->toBeNull();
});

test('system roles cannot be renamed or deleted, but their permissions can change', function (string $nombre) {
    $admin = actingAsAdmin();
    $role = Role::where('name', $nombre)->firstOrFail();

    $this->actingAs($admin)
        ->put("/admin/roles/{$role->id}", ['name' => "{$nombre} X", 'permissions' => []])
        ->assertSessionHasErrors('name');

    $this->actingAs($admin)
        ->delete("/admin/roles/{$role->id}")
        ->assertSessionHasErrors('role');

    $this->actingAs($admin)
        ->put("/admin/roles/{$role->id}", ['name' => $nombre, 'permissions' => ['view courses']])
        ->assertRedirect(route('admin.roles.index'));

    expect(Role::find($role->id)->name)->toBe($nombre);
    expect($role->fresh()->permissions->pluck('name')->all())->toBe(['view courses']);
})->with(['Director', 'Profesor', 'Alumno']);

test('the admin role always keeps every permission', function () {
    $admin = actingAsAdmin();
    $adminRole = Role::where('name', 'Admin')->firstOrFail();

    $this->actingAs($admin)
        ->put("/admin/roles/{$adminRole->id}", ['name' => 'Admin', 'permissions' => ['view courses']])
        ->assertRedirect(route('admin.roles.index'));

    expect($adminRole->fresh()->permissions()->count())->toBe(Permission::count());
});

test('the roles listing flags system roles and where their accounts are registered', function () {
    Role::create(['name' => 'Recepción']);

    $this->actingAs(actingAsAdmin())
        ->get('/admin/roles')
        ->assertInertia(fn ($page) => $page->where('roles', function ($roles) {
            $porNombre = collect($roles)->keyBy('name');

            return $porNombre['Director']['es_sistema'] === true
                && $porNombre['Director']['alta_en']['url'] === route('admin.directores.index')
                && $porNombre['Profesor']['alta_en']['url'] === route('profesores.index')
                && $porNombre['Recepción']['es_sistema'] === false
                && $porNombre['Recepción']['alta_en']['url'] === route('admin.users.index');
        }));
});

test('the roles listing and the permissions matrix show each role\'s permissions and accounts', function () {
    $admin = actingAsAdmin();
    foreach (['Beatriz', 'Eduardo', 'Lupita', 'Nicolás'] as $nombre) {
        User::factory()->create(['name' => $nombre])->assignRole('Profesor');
    }

    $this->actingAs($admin)
        ->get('/admin/roles')
        ->assertInertia(fn ($page) => $page->where('roles', function ($roles) {
            $profesor = collect($roles)->firstWhere('name', 'Profesor');

            return $profesor['users_count'] === 4
                && collect($profesor['muestra'])->all() === ['Beatriz', 'Eduardo', 'Lupita']
                && collect($profesor['permissions'])->contains('manage attendance');
        }));

    $role = Role::findByName('Profesor');

    $this->actingAs($admin)
        ->get("/admin/roles/{$role->id}/edit")
        ->assertInertia(fn ($page) => $page->where('role.users_count', 4)->where('role.alta_en.url', route('profesores.index')));

    $this->actingAs($admin)
        ->get('/admin/permissions')
        ->assertInertia(fn ($page) => $page->where('roles', fn ($roles) => collect($roles)->firstWhere('name', 'Profesor')['users_count'] === 4));
});
