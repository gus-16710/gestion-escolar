<?php

use App\Models\Director;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->sanMiguel = Plantel::factory()->create(['nombre' => 'CICCIS San Miguel']);
    $this->tlacolulan = Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan']);
});

function directorPayload(array $overrides = []): array
{
    return array_merge([
        'nombre' => 'Rosa',
        'apellido_paterno' => 'Martínez',
        'apellido_materno' => 'Luna',
        'curp' => '',
        'fecha_nacimiento' => '1978-05-14',
        'telefono' => '2281112233',
        'email' => 'rosa@example.com',
        'activo' => true,
        'password' => 'password',
        'password_confirmation' => 'password',
        'planteles' => [],
    ], $overrides);
}

test('only admins can manage directores', function () {
    $director = Director::factory()->create();

    $this->get('/admin/directores')->assertRedirect('/login');

    $noAdmin = directorDe($this->sanMiguel);
    $this->actingAs($noAdmin)->get('/admin/directores')->assertForbidden();
    $this->actingAs($noAdmin)->get('/admin/directores/create')->assertForbidden();
    $this->actingAs($noAdmin)->post('/admin/directores', directorPayload())->assertForbidden();
    $this->actingAs($noAdmin)->delete("/admin/directores/{$director->id}")->assertForbidden();
});

test('an admin registers a director with their account, photo and planteles', function () {
    Storage::fake('public');

    $this->actingAs(actingAsAdmin())->get('/admin/directores/create')->assertOk();

    $this->actingAs(actingAsAdmin())
        ->post('/admin/directores', directorPayload([
            'curp' => 'maln780514mvzrns01',
            'planteles' => [(string) $this->sanMiguel->id, (string) $this->tlacolulan->id],
            'foto' => UploadedFile::fake()->image('rosa.jpg'),
        ]))
        ->assertRedirect(route('admin.directores.index'));

    $director = Director::where('email', 'rosa@example.com')->firstOrFail();
    $cuenta = $director->user;

    expect($director->nombre_completo)->toBe('Rosa Martínez Luna');
    expect($director->curp)->toBe('MALN780514MVZRNS01');
    expect($director->foto)->not->toBeNull();
    Storage::disk('public')->assertExists($director->foto);

    expect($cuenta->email)->toBe('rosa@example.com');
    expect($cuenta->name)->toBe('Rosa Martínez Luna');
    expect($cuenta->hasRole('Director'))->toBeTrue();
    expect(Hash::check('password', $cuenta->password))->toBeTrue();
    expect($cuenta->planteles()->pluck('planteles.id')->sort()->values()->all())->toBe([$this->sanMiguel->id, $this->tlacolulan->id]);

    // The new director signs in to their own dashboard, limited to their planteles.
    $this->actingAs($cuenta)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->component('dashboard/director')->has('plantelesFiltro', 2));
});

test('a director needs at least one plantel, an unused email and a password', function () {
    User::factory()->create(['email' => 'rosa@example.com']);

    $this->actingAs(actingAsAdmin())
        ->post('/admin/directores', directorPayload(['password' => '', 'password_confirmation' => '']))
        ->assertSessionHasErrors(['planteles', 'email', 'password']);

    $this->actingAs(actingAsAdmin())
        ->post('/admin/directores', directorPayload(['email' => 'nuevo@example.com', 'planteles' => [999]]))
        ->assertSessionHasErrors('planteles.0');

    $this->actingAs(actingAsAdmin())
        ->post('/admin/directores', directorPayload(['email' => 'nuevo@example.com', 'curp' => 'corta', 'planteles' => [$this->sanMiguel->id]]))
        ->assertSessionHasErrors('curp');

    expect(Director::count())->toBe(0);
});

test('an admin updates a director, their account and planteles', function () {
    $director = Director::factory()->create();
    $director->planteles()->attach($this->sanMiguel);
    $cuenta = $director->user;
    $claveAnterior = $cuenta->password;

    $this->actingAs(actingAsAdmin())
        ->get("/admin/directores/{$director->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('director.planteles', [$this->sanMiguel->id]));

    // Without a password the current one is kept.
    $this->actingAs(actingAsAdmin())
        ->put("/admin/directores/{$director->id}", directorPayload([
            'email' => 'nueva@example.com',
            'password' => '',
            'password_confirmation' => '',
            'planteles' => [$this->tlacolulan->id],
        ]))
        ->assertRedirect(route('admin.directores.index'));

    $director->refresh();
    $cuenta->refresh();

    expect($director->email)->toBe('nueva@example.com');
    expect($cuenta->email)->toBe('nueva@example.com');
    expect($cuenta->name)->toBe('Rosa Martínez Luna');
    expect($cuenta->password)->toBe($claveAnterior);
    expect($director->planteles()->pluck('planteles.id')->all())->toBe([$this->tlacolulan->id]);

    $this->actingAs(actingAsAdmin())
        ->put("/admin/directores/{$director->id}", directorPayload([
            'email' => 'nueva@example.com',
            'password' => 'otra-clave-123',
            'password_confirmation' => 'otra-clave-123',
            'planteles' => [],
        ]))
        ->assertSessionHasErrors('planteles');

    expect(Hash::check('otra-clave-123', $cuenta->fresh()->password))->toBeFalse();
});

test('deleting a director keeps the account but removes the role and planteles', function () {
    $director = Director::factory()->create();
    $director->planteles()->attach($this->sanMiguel);
    $cuenta = $director->user;

    $this->actingAs(actingAsAdmin())
        ->delete("/admin/directores/{$director->id}")
        ->assertRedirect(route('admin.directores.index'));

    expect($director->fresh()->trashed())->toBeTrue();
    expect(User::find($cuenta->id))->not->toBeNull();
    expect($cuenta->fresh()->hasRole('Director'))->toBeFalse();
    expect($cuenta->planteles()->count())->toBe(0);
});

test('an admin cannot delete their own director record', function () {
    $director = Director::factory()->create();
    $director->user->assignRole('Admin');

    $this->actingAs($director->user)
        ->delete("/admin/directores/{$director->id}")
        ->assertSessionHasErrors('director');

    expect($director->fresh()->trashed())->toBeFalse();
});

test('the listing searches directores and shows their planteles', function () {
    $rosa = Director::factory()->create(['nombre' => 'Rosa', 'apellido_paterno' => 'Martínez']);
    $rosa->planteles()->attach($this->sanMiguel);
    Director::factory()->create(['nombre' => 'Luis', 'apellido_paterno' => 'Gómez']);

    $this->actingAs(actingAsAdmin())
        ->get('/admin/directores?search=Mart')
        ->assertInertia(fn ($page) => $page
            ->component('admin/directores/index')
            ->has('directores.data', 1)
            ->where('directores.data.0.id', $rosa->id)
            ->where('directores.data.0.planteles.0.nombre', 'CICCIS San Miguel')
            ->has('directores.data.0.planteles', 1));
});

test('the listing shows what each plantel is doing, links a profesor record with the same name and flags planteles nobody runs', function () {
    $this->travelTo('2026-09-30 10:00');
    $rosa = Director::factory()->create(['nombre' => 'Rosa', 'apellido_paterno' => 'Martínez', 'apellido_materno' => 'Luna']);
    $rosa->planteles()->attach($this->sanMiguel);
    $profesora = Profesor::factory()->create(['nombre' => 'Rosa', 'apellido_paterno' => 'Martinez', 'apellido_materno' => 'Luna']);

    $grupo = Grupo::factory()->create(['plantel_id' => $this->sanMiguel->id, 'estado' => 'en_curso']);
    Inscripcion::factory()->count(2)->create(['grupo_id' => $grupo->id, 'estado' => 'activo']);
    Grupo::factory()->create(['plantel_id' => $this->sanMiguel->id, 'estado' => 'planeado', 'fecha_inicio' => '2026-10-24']);

    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->get('/admin/directores')
        ->assertInertia(fn ($page) => $page
            ->where('conteos', ['todos' => 1, 'activos' => 1, 'inactivos' => 0])
            ->where('directores.data.0.profesor_id', $profesora->id)
            ->where('directores.data.0.es_yo', false)
            ->where('directores.data.0.planteles.0.grupos_en_curso', 1)
            ->where('directores.data.0.planteles.0.grupos_planeados', 1)
            ->where('directores.data.0.planteles.0.alumnos', 2)
            // Something already runs there, but the next opening is still sent.
            ->where('directores.data.0.planteles.0.proxima_apertura', '2026-10-24')
            ->where('plantelesSinDirector', [['id' => $this->tlacolulan->id, 'nombre' => 'CICCIS Tlacolulan', 'clave' => $this->tlacolulan->clave]]));

    // The form tells who else runs each plantel.
    $luis = Director::factory()->create();
    $luis->planteles()->attach($this->sanMiguel);

    $this->actingAs($admin)
        ->get("/admin/directores/{$luis->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->where('planteles', fn ($planteles) => collect($planteles)->firstWhere('id', $this->sanMiguel->id)['directores'] === ['Rosa Martínez Luna'])
            ->where('director.profesor_id', null)
            ->where("actividad.{$this->sanMiguel->id}.alumnos", 2));
});
