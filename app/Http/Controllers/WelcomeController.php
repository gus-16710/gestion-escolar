<?php

namespace App\Http\Controllers;

use App\Models\Curso;
use App\Models\CursoModulo;
use App\Models\DiaSinClase;
use App\Models\Grupo;
use App\Models\Plantel;
use App\Support\CalendarioGrupo;
use App\Support\Reportes\DatosReporte;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public site at "/": the academic offer (active cursos and their study plans), the planteles and the
 * grupos about to open with the places left. Only catalog data, nothing about alumnos.
 */
class WelcomeController extends Controller
{
    public function __invoke(): Response
    {
        $planteles = Plantel::where('activo', true)
            ->with(['cursos' => fn ($query) => $query->where('activo', true)->orderBy('nombre')])
            ->orderBy('nombre')
            ->get();

        $aperturas = Grupo::query()
            ->where('estado', 'planeado')
            ->whereDate('fecha_inicio', '>=', today())
            ->whereHas('curso', fn ($query) => $query->where('activo', true))
            ->whereHas('plantel', fn ($query) => $query->where('activo', true))
            ->with(['curso:id,nombre,clave,duracion_semanas', 'plantel:id,nombre'])
            ->withCount(['inscripciones as inscritos' => fn ($query) => $query->where('estado', 'activo')])
            ->orderBy('fecha_inicio')
            ->orderBy('hora_inicio')
            ->get();
        $diasSinClase = DiaSinClase::all();

        $cursos = Curso::where('activo', true)
            ->with(['modulos', 'planteles' => fn ($query) => $query->where('activo', true)->orderBy('nombre')])
            ->orderBy('nombre')
            ->get()
            ->map(fn (Curso $curso) => [
                'id' => $curso->id,
                'clave' => $curso->clave,
                'nombre' => $curso->nombre,
                'descripcion' => $curso->descripcion,
                'duracion_semanas' => $curso->duracion_semanas,
                'modulos' => $curso->modulos->map(fn (CursoModulo $modulo) => [
                    'orden' => $modulo->orden,
                    'nombre' => $modulo->nombre,
                    'descripcion' => $modulo->descripcion,
                    'semanas' => $modulo->duracion_semanas,
                ])->values(),
                'planteles' => $curso->planteles->pluck('nombre'),
                'proxima_apertura' => $aperturas->firstWhere('curso_id', $curso->id)?->fecha_inicio->format('Y-m-d'),
                'imagen' => $this->imagen("cursos/{$curso->clave}"),
            ]);

        return Inertia::render('welcome', [
            'cursos' => $cursos,
            'planteles' => $planteles->map(fn (Plantel $plantel) => [
                'id' => $plantel->id,
                'nombre' => $plantel->nombre,
                'direccion' => $plantel->direccion_completa,
                'localidad' => collect([$plantel->localidad, $plantel->estado])->filter()->join(', '),
                'telefono' => $plantel->telefono,
                'email' => $plantel->email,
                'imagen' => $this->imagen("planteles/{$plantel->clave}"),
                'cursos' => $plantel->cursos->map(fn (Curso $curso) => ['clave' => $curso->clave, 'nombre' => $curso->nombre])->values(),
            ]),
            'aperturas' => $aperturas->map(fn (Grupo $grupo) => [
                'id' => $grupo->id,
                'curso' => $grupo->curso->nombre,
                'curso_clave' => $grupo->curso->clave,
                'plantel' => $grupo->plantel->nombre,
                'fecha_inicio' => $grupo->fecha_inicio->format('Y-m-d'),
                'fecha_fin' => (new CalendarioGrupo($grupo, $diasSinClase))->finAjustado()?->format('Y-m-d'),
                'horario' => collect([
                    $grupo->dias ? str_replace(',', ', ', $grupo->dias) : null,
                    $grupo->hora_inicio ? substr($grupo->hora_inicio, 0, 5).($grupo->hora_fin ? '–'.substr($grupo->hora_fin, 0, 5) : '') : null,
                ])->filter()->join(' · '),
                'turno' => DatosReporte::TURNOS[$grupo->turno] ?? $grupo->turno,
                'cupo' => $grupo->cupo,
                'lugares' => $grupo->cupo === null ? null : max(0, $grupo->cupo - $grupo->inscritos),
            ]),
            'cifras' => [
                'cursos' => $cursos->count(),
                'planteles' => $planteles->count(),
                'modulos' => $cursos->sum(fn (array $curso) => $curso['modulos']->count()),
                'cupo_maximo' => $aperturas->max('cupo'),
            ],
            'whatsapp' => config('ciccis.whatsapp') ?: null,
            'portada' => $this->imagen('portada'),
        ]);
    }

    /**
     * A photo of the public site (public/images/sitio/{ruta}.webp + .jpg), or null while it isn't there: adding
     * or replacing one is just dropping the files in. The version query busts the browser cache on replace.
     *
     * @return array{webp: ?string, jpg: string, ancho: int, alto: int}|null
     */
    private function imagen(string $ruta): ?array
    {
        $jpg = public_path("images/sitio/{$ruta}.jpg");

        if (! is_file($jpg)) {
            return null;
        }

        [$ancho, $alto] = getimagesize($jpg) ?: [0, 0];
        $version = '?v='.filemtime($jpg);

        return [
            'webp' => is_file(public_path("images/sitio/{$ruta}.webp")) ? asset("images/sitio/{$ruta}.webp").$version : null,
            'jpg' => asset("images/sitio/{$ruta}.jpg").$version,
            'ancho' => $ancho,
            'alto' => $alto,
        ];
    }
}
