<?php

namespace App\Http\Controllers;

use App\Models\Alumno;
use App\Models\DiaSinClase;
use App\Models\DocumentoEmitido;
use App\Models\Grupo;
use App\Models\Inscripcion;
use App\Models\Plantel;
use App\Support\CalendarioGrupo;
use App\Support\Reportes\DatosReporte;
use App\Support\Reportes\ImpresionPdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The reports center (`view reports`: Admin, and Directors within their planteles) and the grupo reports,
 * which are printed on demand without a folio: the grade sheet (concentrado) and the monthly roll-call sheet.
 */
class ReporteController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        abort_unless($request->user()->can('view reports'), 403);

        $user = $request->user();
        $alcance = $user->plantelesAlcance();
        $buscarAlumno = trim((string) $request->string('alumno'));
        $buscarDocumento = trim((string) $request->string('q'));
        $diasSinClase = DiaSinClase::all();

        $grupos = Grupo::query()
            ->when($alcance !== null, fn (Builder $query) => $query->whereIn('plantel_id', $alcance))
            ->where('estado', '!=', 'cancelado')
            ->with(['curso:id,nombre,clave,duracion_semanas', 'plantel:id,nombre', 'clasesSuspendidas'])
            ->orderByRaw("case estado when 'en_curso' then 0 when 'planeado' then 1 else 2 end")
            ->orderByDesc('fecha_inicio')
            ->get()
            ->map(function (Grupo $grupo) use ($diasSinClase) {
                $meses = DatosReporte::meses($grupo, new CalendarioGrupo($grupo, $diasSinClase));

                return [
                    'id' => $grupo->id,
                    'clave' => $grupo->clave,
                    'curso' => $grupo->curso->nombre,
                    'plantel_id' => $grupo->plantel_id,
                    'plantel' => $grupo->plantel->nombre,
                    'estado' => $grupo->estado,
                    'meses' => $meses,
                    'mes_sugerido' => DatosReporte::mesSugerido($meses),
                ];
            });

        return Inertia::render('reportes/index', [
            'planteles' => Plantel::alcanceDe($user)->orderBy('nombre')->get(['id', 'nombre']),
            'grupos' => $grupos,
            'alumnos' => $buscarAlumno === '' ? [] : $this->alumnos($buscarAlumno, $alcance),
            'documentos' => $this->documentos($buscarDocumento, $alcance),
            'emision' => self::datosEmision(Plantel::alcanceDe($user)->pluck('id')->all()),
            'filters' => ['alumno' => $buscarAlumno, 'q' => $buscarDocumento, 'tab' => in_array($request->string('tab')->toString(), ['grupos', 'alumnos', 'documentos'], true) ? $request->string('tab')->toString() : 'grupos'],
            'canVoid' => $alcance === null,
        ]);
    }

    /**
     * The grupo's grade sheet: every alumno × module, with average, attendance and result.
     */
    public function concentrado(Request $request, Grupo $grupo): HttpResponse
    {
        $this->authorize('report', $grupo);

        return ImpresionPdf::vista('concentrado', [
            'd' => DatosReporte::concentrado($grupo),
            'emision' => ['fecha' => now(), 'por' => $request->user()->name],
        ], "concentrado {$grupo->clave}", 'landscape');
    }

    /**
     * The roll-call sheet of one month, filled in or blank to take the roll by hand.
     */
    public function asistencia(Request $request, Grupo $grupo): HttpResponse
    {
        $this->authorize('report', $grupo);

        $validated = $request->validate([
            'mes' => ['nullable', 'date_format:Y-m'],
            'en_blanco' => ['nullable', 'boolean'],
        ]);

        $mes = isset($validated['mes']) ? Carbon::createFromFormat('Y-m-d', $validated['mes'].'-01') : today()->startOfMonth();
        $enBlanco = (bool) ($validated['en_blanco'] ?? false);

        return ImpresionPdf::vista('asistencia', [
            'd' => DatosReporte::asistencia($grupo, $mes, $enBlanco),
            'emision' => ['fecha' => now(), 'por' => $request->user()->name],
        ], "asistencia {$grupo->clave} {$mes->format('Y-m')}", 'landscape');
    }

    /**
     * Alumnos matching the search with their enrollments within reach, to issue their documents.
     *
     * @param  array<int, int>|null  $alcance
     * @return array<int, array<string, mixed>>
     */
    private function alumnos(string $buscar, ?array $alcance): array
    {
        $enAlcance = fn ($query) => $query->when($alcance !== null, fn ($query) => $query->whereIn('plantel_id', $alcance));

        return Alumno::query()
            ->whereHas('inscripciones.grupo', $enAlcance)
            ->where(fn ($query) => self::coincidePersona($query, $buscar))
            ->with(['inscripciones' => fn ($query) => $query->whereHas('grupo', $enAlcance)->orderByDesc('fecha_inscripcion'), 'inscripciones.grupo.curso:id,nombre', 'inscripciones.grupo.plantel:id,nombre'])
            ->orderBy('apellido_paterno')
            ->orderBy('nombre')
            ->limit(8)
            ->get()
            ->map(fn (Alumno $alumno) => [
                'id' => $alumno->id,
                'nombre_completo' => $alumno->nombre_completo,
                'matricula' => $alumno->matricula,
                'foto_url' => $alumno->fotoUrl(),
                'inscripciones' => $alumno->inscripciones->map(fn (Inscripcion $inscripcion) => self::inscripcionParaDocumento($inscripcion))->all(),
            ])
            ->all();
    }

    /**
     * Every word of the search has to match the alumno's matrícula, CURP, name or a surname, so a full name
     * ("Jesús Morales") finds them.
     */
    private static function coincidePersona(Builder $query, string $buscar): void
    {
        foreach (preg_split('/\s+/', trim($buscar)) as $palabra) {
            $query->where(fn (Builder $query) => $query
                ->where('matricula', 'like', "%{$palabra}%")
                ->orWhere('curp', 'like', "%{$palabra}%")
                ->orWhere('nombre', 'like', "%{$palabra}%")
                ->orWhere('apellido_paterno', 'like', "%{$palabra}%")
                ->orWhere('apellido_materno', 'like', "%{$palabra}%"));
        }
    }

    /**
     * What the issue dialog needs besides the enrollment: who can sign in each plantel, the folios the next
     * documents will take, and the CSRF token for its plain form post (the PDF opens in a new tab).
     *
     * @param  array<int, int>  $plantelIds
     * @return array<string, mixed>
     */
    public static function datosEmision(array $plantelIds): array
    {
        return [
            'firmantes' => collect($plantelIds)->unique()->mapWithKeys(fn (int $id) => [$id => DatosReporte::firmantes($id)]),
            'siguientesFolios' => collect(DocumentoEmitido::PREFIJOS)->keys()->mapWithKeys(fn (string $tipo) => [$tipo => DocumentoEmitido::siguienteFolio($tipo, today()->year)]),
            'csrf' => csrf_token(),
        ];
    }

    /**
     * What the issue dialog needs about an enrollment (also used by the alumno record).
     *
     * @return array<string, mixed>
     */
    public static function inscripcionParaDocumento(Inscripcion $inscripcion): array
    {
        return [
            'id' => $inscripcion->id,
            'grupo' => $inscripcion->grupo->clave,
            'curso' => $inscripcion->grupo->curso->nombre,
            'plantel_id' => $inscripcion->grupo->plantel_id,
            'plantel' => $inscripcion->grupo->plantel->nombre,
            'estado' => $inscripcion->estado,
            'promedio_final' => $inscripcion->promedio_final,
            'puede_constancia' => $inscripcion->estado === 'egresado',
        ];
    }

    /**
     * Issued documents within reach, newest first, searchable by folio, alumno or matrícula.
     *
     * @param  array<int, int>|null  $alcance
     */
    private function documentos(string $buscar, ?array $alcance): mixed
    {
        return DocumentoEmitido::query()
            ->whereHas('inscripcion.grupo', fn ($query) => $query->withTrashed()->when($alcance !== null, fn ($query) => $query->whereIn('plantel_id', $alcance)))
            ->when($buscar !== '', fn ($query) => $query->where(fn ($query) => $query
                ->where('folio', 'like', "%{$buscar}%")
                ->orWhereHas('inscripcion.alumno', fn ($query) => $query->withTrashed()->where(fn ($query) => self::coincidePersona($query, $buscar)))))
            ->with(['emitidoPor:id,name', 'anuladoPor:id,name'])
            ->latest('id')
            ->paginate(10, pageName: 'pagina')
            ->withQueryString()
            ->through(fn (DocumentoEmitido $documento) => [
                'id' => $documento->id,
                'tipo' => $documento->tipo,
                'folio' => $documento->folio,
                'alumno' => $documento->datos['alumno']['nombre'] ?? null,
                'matricula' => $documento->datos['alumno']['matricula'] ?? null,
                'curso' => $documento->datos['curso']['nombre'] ?? null,
                'grupo' => $documento->datos['grupo']['clave'] ?? null,
                'emitido_en' => $documento->created_at->format('Y-m-d H:i'),
                'emitido_por' => $documento->emitidoPor?->name,
                'firmante' => $documento->firmante,
                'vigente' => $documento->vigente(),
                'anulado_en' => $documento->anulado_en?->format('Y-m-d'),
                'anulado_por' => $documento->anuladoPor?->name,
                'motivo_anulacion' => $documento->motivo_anulacion,
                'url_verificacion' => $documento->urlVerificacion(),
            ]);
    }
}
