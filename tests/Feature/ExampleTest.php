<?php

use App\Models\Curso;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\User;

beforeEach(function () {
    $this->travelTo('2026-10-01 10:00');
});

it('shows the public site at the home page, to guests and signed-in users', function () {
    $this->get('/')->assertOk()->assertInertia(fn ($page) => $page->component('welcome'));
    $this->get('/dashboard')->assertRedirect('/login');

    $this->actingAs(User::factory()->create())->get('/')->assertOk();
});

it('lists only active cursos and planteles, and upcoming grupos with the places left', function () {
    $plantel = Plantel::factory()->create(['activo' => true]);
    Plantel::factory()->create(['activo' => false]);
    $curso = Curso::factory()->create(['activo' => true, 'nombre' => 'Barbería']);
    Curso::factory()->create(['activo' => false]);
    $curso->modulos()->create(['orden' => 1, 'nombre' => 'Fundamentos', 'duracion_semanas' => 8]);
    $plantel->cursos()->attach($curso);

    $proximo = Grupo::factory()->create(['plantel_id' => $plantel->id, 'curso_id' => $curso->id, 'estado' => 'planeado', 'fecha_inicio' => '2026-10-24', 'cupo' => 10]);
    Inscripcion::factory(3)->create(['grupo_id' => $proximo->id]);
    Inscripcion::factory()->create(['grupo_id' => $proximo->id, 'estado' => 'baja']);
    // Running or already started grupos aren't "upcoming".
    Grupo::factory()->create(['plantel_id' => $plantel->id, 'curso_id' => $curso->id, 'estado' => 'en_curso', 'fecha_inicio' => '2026-06-07']);
    Grupo::factory()->create(['plantel_id' => $plantel->id, 'curso_id' => $curso->id, 'estado' => 'planeado', 'fecha_inicio' => '2026-09-01']);

    $this->get('/')
        ->assertInertia(fn ($page) => $page
            ->has('cursos', 1)
            ->where('cursos.0.nombre', 'Barbería')
            ->where('cursos.0.modulos.0.nombre', 'Fundamentos')
            ->where('cursos.0.proxima_apertura', '2026-10-24')
            ->has('planteles', 1)
            ->where('planteles.0.cursos.0.nombre', 'Barbería')
            ->has('aperturas', 1)
            ->where('aperturas.0.lugares', 7)
            ->where('cifras', ['cursos' => 1, 'planteles' => 1, 'modulos' => 1, 'cupo_maximo' => 10])
            ->where('whatsapp', null));
});

it('builds the WhatsApp number from the configuration', function () {
    config(['ciccis.whatsapp' => '5212281234567']);

    $this->get('/')->assertInertia(fn ($page) => $page->where('whatsapp', '5212281234567'));
});

it('shows a site photo as soon as its file is in place', function () {
    Curso::factory()->create(['activo' => true, 'clave' => 'ZZQ']);
    $ruta = public_path('images/sitio/cursos/ZZQ');

    $this->get('/')->assertInertia(fn ($page) => $page->where('cursos.0.imagen', null));

    @mkdir(dirname($ruta), 0777, true);
    $imagen = imagecreatetruecolor(30, 20);
    imagejpeg($imagen, "{$ruta}.jpg");
    imagewebp($imagen, "{$ruta}.webp");

    try {
        $this->get('/')->assertInertia(fn ($page) => $page
            ->where('cursos.0.imagen.ancho', 30)
            ->where('cursos.0.imagen.alto', 20)
            ->where('cursos.0.imagen.jpg', fn ($url) => str_contains($url, 'images/sitio/cursos/ZZQ.jpg?v='))
            ->where('cursos.0.imagen.webp', fn ($url) => str_contains($url, 'ZZQ.webp')));
    } finally {
        @unlink("{$ruta}.jpg");
        @unlink("{$ruta}.webp");
    }
});
