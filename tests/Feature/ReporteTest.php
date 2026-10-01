<?php

use App\Models\Calificacion;
use App\Models\ClaseSuspendida;
use App\Models\Curso;
use App\Models\DiaSinClase;
use App\Models\Director;
use App\Models\DocumentoEmitido;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Models\Profesor;
use App\Models\User;
use App\Support\Reportes\DatosReporte;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->travelTo('2026-10-01 10:00');

    $this->profesorUser = User::factory()->create();
    $this->profesorUser->assignRole('Profesor');
    $profesor = Profesor::factory()->create(['user_id' => $this->profesorUser->id]);

    $curso = Curso::factory()->create(['duracion_semanas' => 8]);
    [$this->m1, $this->m2] = collect([['Teoría', 4], ['Práctica', 4]])
        ->map(fn ($datos, $i) => $curso->modulos()->create(['orden' => $i + 1, 'nombre' => $datos[0], 'duracion_semanas' => $datos[1]]))
        ->all();

    $this->grupo = Grupo::factory()->create([
        'curso_id' => $curso->id,
        'profesor_id' => $profesor->id,
        'dias' => 'Dom',
        'estado' => 'en_curso',
        'fecha_inicio' => '2026-08-02',
        'fecha_fin' => '2026-09-27',
    ]);

    $this->inscripcion = Inscripcion::factory()->create(['grupo_id' => $this->grupo->id, 'fecha_inscripcion' => '2026-08-01']);

    foreach ([[$this->m1, 8], [$this->m2, 9]] as [$modulo, $calificacion]) {
        Calificacion::create(['inscripcion_id' => $this->inscripcion->id, 'curso_modulo_id' => $modulo->id, 'calificacion' => $calificacion, 'fecha_evaluacion' => '2026-09-27']);
    }

    // The plantel's director, who signs its documents.
    $this->director = directorDe($this->grupo->plantel);
    Director::factory()->create(['user_id' => $this->director->id, 'nombre' => 'Ana', 'apellido_paterno' => 'Ruiz', 'apellido_materno' => 'Paz']);

    $this->emitir = fn (string $tipo, array $extra = []) => $this->post("/inscripciones/{$this->inscripcion->id}/documentos", ['tipo' => $tipo, ...$extra]);
});

test('the grupo reports are PDFs for the admin and the director of the plantel only', function () {
    foreach (["/grupos/{$this->grupo->id}/reportes/concentrado", "/grupos/{$this->grupo->id}/reportes/asistencia?mes=2026-09", "/grupos/{$this->grupo->id}/reportes/asistencia?mes=2026-09&en_blanco=1"] as $url) {
        $this->actingAs(actingAsAdmin())->get($url)->assertOk()->assertHeader('content-type', 'application/pdf');
        $this->actingAs($this->director)->get($url)->assertOk();
        $this->actingAs(directorDe(Plantel::factory()->create()))->get($url)->assertForbidden();
        $this->actingAs($this->profesorUser)->get($url)->assertForbidden();
    }

    $this->actingAs($this->profesorUser)->get('/reportes')->assertForbidden();
});

test('a boleta takes the next folio and can be downloaded again without a new one', function () {
    $this->actingAs($this->director);

    ($this->emitir)('boleta')->assertRedirect(route('documentos.pdf', DocumentoEmitido::first()));
    ($this->emitir)('boleta');

    expect(DocumentoEmitido::pluck('folio')->all())->toBe(['BOL-2026-0001', 'BOL-2026-0002']);

    $documento = DocumentoEmitido::first();
    expect($documento->firmante)->toBe('Ana Ruiz Paz')
        ->and($documento->emitido_por)->toBe($this->director->id)
        ->and($documento->datos['promedio_final'])->toEqual(8.5)
        ->and($documento->datos['parcial'])->toBeTrue()
        ->and($documento->datos['alumno']['matricula'])->toBe($this->inscripcion->alumno->matricula);

    $this->get("/documentos/{$documento->id}/pdf")->assertOk()->assertHeader('content-type', 'application/pdf');
    expect(DocumentoEmitido::count())->toBe(2);

    // A new year starts the count again.
    $this->travelTo('2027-01-05 09:00');
    ($this->emitir)('boleta');
    expect(DocumentoEmitido::latest('id')->value('folio'))->toBe('BOL-2027-0001');

    // Other planteles can't issue or download it.
    $this->actingAs(directorDe(Plantel::factory()->create()));
    ($this->emitir)('boleta')->assertForbidden();
    $this->get("/documentos/{$documento->id}/pdf")->assertForbidden();
});

test('a constancia is only issued to a graduate, and the signer must run the plantel', function () {
    $this->actingAs(actingAsAdmin());

    ($this->emitir)('constancia')->assertSessionHasErrors(['tipo' => 'La constancia solo se emite a un alumno egresado del curso.']);
    expect(DocumentoEmitido::count())->toBe(0);

    $this->inscripcion->update(['estado' => 'egresado', 'promedio_final' => 8.5, 'fecha_cierre' => '2026-10-01']);

    ($this->emitir)('constancia', ['firmante' => 'Alguien Más'])->assertSessionHasErrors('firmante');
    ($this->emitir)('constancia', ['firmante' => 'Ana Ruiz Paz'])->assertRedirect();

    $constancia = DocumentoEmitido::sole();
    expect($constancia->folio)->toBe('CON-2026-0001')
        ->and($constancia->datos['promedio_final'])->toEqual(8.5)
        ->and($constancia->datos['estado'])->toBe('egresado');
});

test('anyone can verify a document by its code, and only the admin voids it', function () {
    $this->actingAs($this->director);
    ($this->emitir)('boleta');
    $documento = DocumentoEmitido::sole();

    auth()->logout();
    $this->get("/verificar/{$documento->codigo}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('verificar')
            ->where('documento.folio', 'BOL-2026-0001')
            ->where('documento.vigente', true)
            ->where('documento.alumno', $this->inscripcion->alumno->nombre_completo));
    $this->get('/verificar/no-existe')->assertInertia(fn ($page) => $page->where('documento', null));

    $this->actingAs($this->director)->patch("/documentos/{$documento->id}/anular", ['motivo' => 'Error'])->assertForbidden();

    $this->actingAs(actingAsAdmin())->patch("/documentos/{$documento->id}/anular", ['motivo' => ''])->assertSessionHasErrors('motivo');
    $this->patch("/documentos/{$documento->id}/anular", ['motivo' => 'Se corrigió una calificación'])->assertRedirect();

    expect($documento->fresh()->vigente())->toBeFalse();
    $this->get("/verificar/{$documento->codigo}")->assertInertia(fn ($page) => $page
        ->where('documento.vigente', false)
        ->where('documento.motivo_anulacion', 'Se corrigió una calificación'));
});

test('reopening a grupo voids the constancias of its alumnos', function () {
    $admin = actingAsAdmin();
    $this->actingAs($admin)->post("/grupos/{$this->grupo->id}/cierre")->assertRedirect();
    ($this->emitir)('constancia')->assertRedirect();
    ($this->emitir)('boleta');

    $this->delete("/grupos/{$this->grupo->id}/cierre");

    expect(DocumentoEmitido::where('tipo', 'constancia')->sole()->only('motivo_anulacion', 'anulado_por'))->toBe(['motivo_anulacion' => 'Grupo reabierto', 'anulado_por' => $admin->id])
        ->and(DocumentoEmitido::where('tipo', 'boleta')->sole()->vigente())->toBeTrue();
});

test('the roll-call sheet takes the class days of the grupo calendar', function () {
    DiaSinClase::create(['plantel_id' => null, 'fecha_inicio' => '2026-09-13', 'fecha_fin' => '2026-09-13', 'motivo' => 'Festivo']);
    ClaseSuspendida::create(['grupo_id' => $this->grupo->id, 'fecha' => '2026-09-20', 'motivo' => 'profesor', 'fecha_reposicion' => '2026-09-23']);
    $this->inscripcion->asistencias()->create(['fecha' => '2026-09-06', 'estado' => 'presente']);
    $this->inscripcion->asistencias()->create(['fecha' => '2026-09-23', 'estado' => 'falta']);
    $tarde = Inscripcion::factory()->create(['grupo_id' => $this->grupo->id, 'fecha_inscripcion' => '2026-09-15']);

    $hoja = DatosReporte::asistencia($this->grupo->fresh(), Carbon::parse('2026-09-01'), false);

    expect(collect($hoja['fechas'])->map(fn ($dia) => [$dia['fecha'], $dia['sin_clase'], $dia['reposicion']])->all())->toBe([
        ['2026-09-06', null, false],
        ['2026-09-13', 'Sin clase', false],
        ['2026-09-20', 'Suspendida', false],
        ['2026-09-23', null, true],
        ['2026-09-27', null, false],
    ]);

    $alumno = collect($hoja['alumnos'])->firstWhere('matricula', $this->inscripcion->alumno->matricula);
    expect($alumno['dias'])->toBe(['P', '', '', 'F', ''])
        ->and($alumno['totales'])->toBe(['P' => 1, 'R' => 0, 'F' => 1, 'J' => 0, 'porcentaje' => 50]);

    // Enrolled mid-month: the days before don't apply to them.
    expect(collect($hoja['alumnos'])->firstWhere('matricula', $tarde->alumno->matricula)['dias'])->toBe(['–', '–', '', '', '']);

    $enBlanco = DatosReporte::asistencia($this->grupo->fresh(), Carbon::parse('2026-09-01'), true);
    expect(collect($enBlanco['alumnos'])->firstWhere('matricula', $this->inscripcion->alumno->matricula))
        ->dias->toBe(['', '', '', '', ''])
        ->totales->toBeNull();
});

test('the reports center finds alumnos and lists issued documents within reach', function () {
    $this->actingAs($this->director);
    ($this->emitir)('boleta');

    $otroPlantel = Grupo::factory()->create(['estado' => 'en_curso']);
    Inscripcion::factory()->create(['grupo_id' => $otroPlantel->id]);

    $this->get('/reportes?tab=alumnos&alumno='.urlencode($this->inscripcion->alumno->nombre.' '.$this->inscripcion->alumno->apellido_paterno))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reportes/index')
            ->where('filters.tab', 'alumnos')
            ->has('grupos', 1)
            ->has('alumnos', 1)
            ->where('alumnos.0.inscripciones.0.id', $this->inscripcion->id)
            ->where('alumnos.0.inscripciones.0.puede_constancia', false)
            ->has('documentos.data', 1)
            ->where('emision.siguientesFolios.boleta', 'BOL-2026-0002')
            ->where('emision.firmantes.'.$this->grupo->plantel_id, ['Ana Ruiz Paz']));

    $this->actingAs(directorDe($otroPlantel->plantel))
        ->get('/reportes')
        ->assertInertia(fn ($page) => $page->has('grupos', 1)->has('documentos.data', 0));
});
