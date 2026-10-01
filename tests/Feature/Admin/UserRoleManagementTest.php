<?php

use App\Models\Alumno;
use App\Models\Director;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    // A custom staff role, the kind of role the Usuarios screen still manages besides Admin.
    Role::create(['name' => 'Coordinación']);
});

test('guests are redirected to the login page', function () {
    $this->get('/admin/users')->assertRedirect('/login');
});

test('non-admins cannot access the admin users page', function () {
    $user = User::factory()->create();
    $user->assignRole('Profesor');

    $this->actingAs($user)->get('/admin/users')->assertForbidden();
});

test('admins can view the admin users page', function () {
    $this->actingAs(actingAsAdmin())->get('/admin/users')->assertOk();
});

test('admins can change a user role', function () {
    $target = User::factory()->create();

    $this->actingAs(actingAsAdmin())
        ->put("/admin/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'roles' => ['Coordinación'],
            'permissions' => [],
        ])
        ->assertRedirect(route('admin.users.index'));

    expect($target->fresh()->hasRole('Coordinación'))->toBeTrue();
});

test('non-admins cannot change a user role', function () {
    $profesor = User::factory()->create();
    $profesor->assignRole('Profesor');

    $target = User::factory()->create();
    $target->assignRole('Coordinación');

    $this->actingAs($profesor)
        ->put("/admin/users/{$target->id}", [
            'name' => $target->name,
            'email' => $target->email,
            'roles' => ['Admin'],
            'permissions' => [],
        ])
        ->assertForbidden();

    expect($target->fresh()->hasRole('Admin'))->toBeFalse();
});

test('the last admin cannot lose their admin role', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->put("/admin/users/{$admin->id}", [
            'name' => $admin->name,
            'email' => $admin->email,
            'roles' => ['Coordinación'],
            'permissions' => [],
        ])
        ->assertSessionHasErrors('roles');

    expect($admin->fresh()->hasRole('Admin'))->toBeTrue();
});

test('an admin can change roles when another admin exists', function () {
    $admin = actingAsAdmin();
    $otherAdmin = actingAsAdmin();

    $this->actingAs($admin)
        ->put("/admin/users/{$otherAdmin->id}", [
            'name' => $otherAdmin->name,
            'email' => $otherAdmin->email,
            'roles' => ['Coordinación'],
            'permissions' => [],
        ])
        ->assertRedirect(route('admin.users.index'));

    expect($otherAdmin->fresh()->getRoleNames()->all())->toBe(['Coordinación']);
});

test('the users screen does not offer the roles that have their own module', function () {
    $this->actingAs(actingAsAdmin())
        ->get('/admin/users/create')
        ->assertInertia(fn ($page) => $page->where('roles', fn ($roles) => collect($roles)->intersect(['Director', 'Profesor', 'Alumno'])->isEmpty()
            && collect($roles)->contains('Admin')));
});

test('director, profesor and alumno roles cannot be granted from the users screen', function (string $rol) {
    $admin = actingAsAdmin();
    $target = User::factory()->create();

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'Nueva',
            'email' => 'nueva@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'roles' => [$rol],
        ])
        ->assertSessionHasErrors('roles.0');

    $this->actingAs($admin)
        ->put("/admin/users/{$target->id}", ['name' => $target->name, 'email' => $target->email, 'roles' => [$rol]])
        ->assertSessionHasErrors('roles.0');

    expect(User::where('email', 'nueva@example.com')->exists())->toBeFalse();
    expect($target->fresh()->hasRole($rol))->toBeFalse();
})->with(['Director', 'Profesor', 'Alumno']);

test('saving an account keeps the roles that belong to its records', function () {
    $target = User::factory()->create();
    $target->assignRole(['Coordinación', 'Director', 'Profesor']);

    $this->actingAs(actingAsAdmin())
        ->put("/admin/users/{$target->id}", ['name' => $target->name, 'email' => $target->email, 'roles' => []])
        ->assertRedirect(route('admin.users.index'));

    expect($target->fresh()->getRoleNames()->sort()->values()->all())->toBe(['Director', 'Profesor']);
});

test('accounts that belong to a director, profesor or alumno are managed from their record', function () {
    $admin = actingAsAdmin();
    $director = Director::factory()->create();
    $cuentaProfesor = User::factory()->create();
    $cuentaProfesor->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $cuentaProfesor->id]);
    $cuentaAlumno = User::factory()->create();
    $cuentaAlumno->assignRole('Alumno');
    $alumno = Alumno::factory()->create(['user_id' => $cuentaAlumno->id]);

    $this->actingAs($admin)
        ->get('/admin/users?tipo=todas')
        ->assertInertia(fn ($page) => $page->where('users.data', function ($users) use ($admin, $director, $cuentaProfesor, $profesor, $cuentaAlumno, $alumno) {
            $url = fn (int $id) => collect($users)->firstWhere('id', $id)['ficha_url'];

            return $url($director->user_id) === route('admin.directores.edit', $director)
                && $url($cuentaProfesor->id) === route('profesores.edit', $profesor)
                && $url($cuentaAlumno->id) === route('alumnos.edit', $alumno)
                && $url($admin->id) === null;
        }));

    $this->actingAs($admin)->get("/admin/users/{$director->user_id}/edit")->assertRedirect(route('admin.directores.edit', $director));
    $this->actingAs($admin)->get("/admin/users/{$cuentaProfesor->id}/edit")->assertRedirect(route('profesores.edit', $profesor));
    $this->actingAs($admin)->put("/admin/users/{$cuentaProfesor->id}", ['name' => 'X', 'email' => 'x@example.com'])->assertSessionHasErrors('user');
    $this->actingAs($admin)->delete("/admin/users/{$cuentaAlumno->id}")->assertSessionHasErrors('user');

    expect($cuentaProfesor->fresh()->email)->not->toBe('x@example.com');
    expect(User::find($cuentaAlumno->id))->not->toBeNull();
});

test('the listing shows administration accounts by default and filters by type', function () {
    $admin = actingAsAdmin();
    $coordinadora = User::factory()->create(['name' => 'Coordinadora']);
    $coordinadora->assignRole('Coordinación');
    $director = Director::factory()->create();
    $cuentaProfesor = User::factory()->create();
    $cuentaProfesor->assignRole('Profesor');
    Profesor::factory()->create(['user_id' => $cuentaProfesor->id]);

    $this->actingAs($admin)
        ->get('/admin/users')
        ->assertInertia(fn ($page) => $page
            ->where('tipo', 'administracion')
            ->where('conteos.administracion', 2)
            ->where('conteos.directores', 1)
            ->where('conteos.profesores', 1)
            ->where('conteos.todas', 4)
            ->where('users.data', fn ($users) => collect($users)->pluck('id')->sort()->values()->all() === collect([$admin->id, $coordinadora->id])->sort()->values()->all()));

    $this->actingAs($admin)
        ->get('/admin/users?tipo=profesores')
        ->assertInertia(fn ($page) => $page
            ->has('users.data', 1)
            ->where('users.data.0.id', $cuentaProfesor->id)
            ->where('users.data.0.tipo', 'Profesor'));

    $this->actingAs($admin)
        ->get('/admin/users?tipo=directores')
        ->assertInertia(fn ($page) => $page->has('users.data', 1)->where('users.data.0.id', $director->user_id));

    // An unknown type falls back to administration accounts.
    $this->actingAs($admin)->get('/admin/users?tipo=otra')->assertInertia(fn ($page) => $page->where('tipo', 'administracion'));
});

test('the listing searches by name or email and paginates', function () {
    $admin = actingAsAdmin();
    User::factory()->create(['name' => 'Coordinadora Ruiz', 'email' => 'coord@example.com'])->assignRole('Coordinación');
    User::factory(12)->create()->each->assignRole('Coordinación');

    $this->actingAs($admin)
        ->get('/admin/users?search=Ruiz')
        ->assertInertia(fn ($page) => $page->has('users.data', 1)->where('users.data.0.email', 'coord@example.com'));

    $this->actingAs($admin)
        ->get('/admin/users?per_page=10')
        ->assertInertia(fn ($page) => $page->has('users.data', 10)->where('users.total', 14)->where('perPage', 10));
});

test('an admin who also has a director record is still managed from the users screen', function () {
    $director = Director::factory()->create();
    $director->user->assignRole('Admin');

    $this->actingAs(actingAsAdmin())->get("/admin/users/{$director->user_id}/edit")->assertOk();
});

test('the listing shows each account\'s photo, last activity from the session store and which one is yours', function () {
    config(['session.driver' => 'database']);
    $this->travelTo('2026-10-01 12:00');
    $admin = actingAsAdmin();
    $coordinadora = User::factory()->create(['name' => 'Ana Coordinadora']);
    $coordinadora->assignRole('Coordinación');
    $cuentaProfesor = User::factory()->create();
    $cuentaProfesor->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $cuentaProfesor->id, 'foto' => 'profesores/beatriz.jpg']);

    DB::table('sessions')->insert([
        ['id' => 'a', 'user_id' => $coordinadora->id, 'ip_address' => null, 'user_agent' => null, 'payload' => '', 'last_activity' => now()->subHours(3)->timestamp],
        ['id' => 'b', 'user_id' => $coordinadora->id, 'ip_address' => null, 'user_agent' => null, 'payload' => '', 'last_activity' => now()->subHour()->timestamp],
    ]);

    $this->actingAs($admin)
        ->get('/admin/users?tipo=todas')
        ->assertInertia(function ($page) use ($admin, $coordinadora, $profesor) {
            $porId = collect($page->toArray()['props']['users']['data'])->keyBy('id');

            expect($porId[$coordinadora->id]['ultima_actividad'])->toBe(now()->subHour()->toIso8601String());
            expect($porId[$coordinadora->id]['es_yo'])->toBeFalse();
            expect($porId[$admin->id]['es_yo'])->toBeTrue();
            expect($porId[$profesor->user_id]['foto_url'])->toEndWith('storage/profesores/beatriz.jpg');
        });
});

test('the user form gets every role\'s permissions for its preview and the roles that come from a record', function () {
    $admin = actingAsAdmin();
    $otro = User::factory()->create();
    $otro->assignRole('Admin', 'Director');

    $this->actingAs($admin)
        ->get("/admin/users/{$otro->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->where('user.roles', ['Admin'])
            ->where('user.roles_de_ficha', ['Director'])
            ->where('permisosDeRoles.Profesor', fn ($permisos) => collect($permisos)->contains('manage attendance'))
            ->where('permisosDeRoles.Coordinación', []));
});
