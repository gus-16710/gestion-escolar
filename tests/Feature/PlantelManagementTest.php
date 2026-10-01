<?php

use App\Models\Curso;
use App\Models\Director;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function plantelPayload(array $overrides = []): array
{
    return array_merge([
        'nombre' => 'CICCIS Tlacolulan',
        'clave' => 'tl',
        'calle' => 'Av. Juárez',
        'numero_exterior' => '12',
        'numero_interior' => '',
        'colonia' => 'Centro',
        'codigo_postal' => '91800',
        'localidad' => 'Tlacolulan',
        'municipio' => 'Tlacolulan',
        'estado' => 'Veracruz',
        'telefono' => '2281234567',
        'email' => 'tlacolulan@example.com',
        'activo' => true,
    ], $overrides);
}

test('guests are redirected to the login page', function () {
    $this->get('/planteles')->assertRedirect('/login');
});

test('users without view planteles permission cannot see the list', function () {
    $profesor = User::factory()->create();
    $profesor->assignRole('Profesor');

    $this->actingAs($profesor)->get('/planteles')->assertForbidden();
});

test('directors can view the list but cannot manage planteles', function () {
    $director = User::factory()->create();
    $director->assignRole('Director');
    $plantel = Plantel::factory()->create();

    $this->actingAs($director)->get('/planteles')->assertOk();
    $this->actingAs($director)->get('/planteles/create')->assertForbidden();
    $this->actingAs($director)->post('/planteles', plantelPayload())->assertForbidden();
    $this->actingAs($director)->put("/planteles/{$plantel->id}", plantelPayload())->assertForbidden();
    $this->actingAs($director)->delete("/planteles/{$plantel->id}")->assertForbidden();
});

test('admins can create a plantel', function () {
    $admin = actingAsAdmin();

    $this->actingAs($admin)
        ->post('/planteles', plantelPayload())
        ->assertRedirect(route('planteles.index'));

    $plantel = Plantel::where('clave', 'TL')->firstOrFail();

    expect($plantel->nombre)->toBe('CICCIS Tlacolulan');
    expect($plantel->numero_interior)->toBeNull();
    expect($plantel->cursos)->toBeEmpty();
});

test('admins can update a plantel without touching the courses it offers', function () {
    $admin = actingAsAdmin();
    $plantel = Plantel::factory()->create();
    $barberia = Curso::factory()->create(['nombre' => 'Barbería']);
    $plantel->cursos()->attach($barberia);

    $this->actingAs($admin)
        ->get("/planteles/{$plantel->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('cursos.0.nombre', 'Barbería')->missing('plantel.cursos'));

    // The offer is edited from Cursos; a stray "cursos" field is ignored.
    $this->actingAs($admin)
        ->put("/planteles/{$plantel->id}", plantelPayload(['clave' => $plantel->clave, 'activo' => false, 'cursos' => []]))
        ->assertRedirect(route('planteles.index'));

    $plantel->refresh();

    expect($plantel->activo)->toBeFalse();
    expect($plantel->localidad)->toBe('Tlacolulan');
    expect($plantel->cursos->pluck('id')->all())->toBe([$barberia->id]);
});

test('plantel data is validated', function () {
    $admin = actingAsAdmin();
    Plantel::factory()->create(['clave' => 'RL']);

    $this->actingAs($admin)
        ->post('/planteles', plantelPayload(['clave' => 'RL', 'codigo_postal' => '123']))
        ->assertSessionHasErrors(['clave', 'codigo_postal']);
});

test('a plantel without active groups can be deleted', function () {
    $admin = actingAsAdmin();
    $plantel = Plantel::factory()->create();
    Grupo::factory()->create(['plantel_id' => $plantel->id, 'estado' => 'concluido']);

    $this->actingAs($admin)
        ->delete("/planteles/{$plantel->id}")
        ->assertRedirect(route('planteles.index'));

    expect($plantel->fresh()->trashed())->toBeTrue();
});

test('a plantel with active groups cannot be deleted', function () {
    $admin = actingAsAdmin();
    $plantel = Plantel::factory()->create();
    Grupo::factory()->create(['plantel_id' => $plantel->id, 'estado' => 'en_curso']);

    $this->actingAs($admin)
        ->delete("/planteles/{$plantel->id}")
        ->assertSessionHasErrors('plantel');

    expect($plantel->fresh()->trashed())->toBeFalse();
});

test('the list shows each plantel\'s activity, its next opening, who runs it and what it teaches', function () {
    $this->travelTo('2026-09-30 10:00');
    $rafaelLucio = Plantel::factory()->create(['nombre' => 'CICCIS Rafael Lucio']);
    $tlacolulan = Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan']);
    $barberia = Curso::factory()->create(['nombre' => 'Barbería', 'clave' => 'BAR']);
    $rafaelLucio->cursos()->attach($barberia);

    $profesor = Profesor::factory()->create();
    $enCurso = Grupo::factory()->create(['plantel_id' => $rafaelLucio->id, 'profesor_id' => $profesor->id, 'estado' => 'en_curso']);
    Grupo::factory()->create(['plantel_id' => $rafaelLucio->id, 'profesor_id' => $profesor->id, 'estado' => 'planeado', 'fecha_inicio' => '2026-08-01']);
    Inscripcion::factory()->count(2)->create(['grupo_id' => $enCurso->id, 'estado' => 'activo']);
    Inscripcion::factory()->create(['grupo_id' => $enCurso->id, 'estado' => 'baja']);
    Grupo::factory()->create(['plantel_id' => $tlacolulan->id, 'estado' => 'planeado', 'fecha_inicio' => '2026-10-24']);

    $director = Director::factory()->create(['nombre' => 'Nicolás', 'apellido_paterno' => 'Ramírez', 'apellido_materno' => 'Ortega']);
    $director->planteles()->attach($rafaelLucio);

    $this->actingAs(actingAsAdmin())
        ->get('/planteles')
        ->assertInertia(fn ($page) => $page
            ->where('planteles.data.0.nombre', 'CICCIS Rafael Lucio')
            ->where('planteles.data.0.estadisticas', ['grupos_en_curso' => 1, 'grupos_planeados' => 1, 'alumnos' => 2, 'profesores' => 1])
            ->where('planteles.data.0.proxima_apertura', null)
            ->where('planteles.data.0.directores.0.nombre', 'Nicolás Ramírez Ortega')
            ->where('planteles.data.0.cursos.0.clave', 'BAR')
            ->where('planteles.data.1.proxima_apertura', '2026-10-24')
            ->where('planteles.data.1.directores', []));
});

test('the edit form summarizes the plantel and knows the claves in use', function () {
    $plantel = Plantel::factory()->create(['clave' => 'RL']);
    Plantel::factory()->create(['nombre' => 'CICCIS Tlacolulan', 'clave' => 'TL'])->delete();
    $grupo = Grupo::factory()->create(['plantel_id' => $plantel->id, 'estado' => 'en_curso']);
    Inscripcion::factory()->create(['grupo_id' => $grupo->id, 'estado' => 'activo']);
    Grupo::factory()->create(['plantel_id' => $plantel->id, 'estado' => 'concluido']);

    $this->actingAs(actingAsAdmin())
        ->get("/planteles/{$plantel->id}/edit")
        ->assertInertia(fn ($page) => $page
            ->where('resumen', ['planeado' => 0, 'en_curso' => 1, 'concluido' => 1, 'cancelado' => 0, 'alumnos' => 1, 'profesores' => 1])
            ->where('directores', [])
            ->where('clavesUsadas', ['TL' => 'CICCIS Tlacolulan']));
});
