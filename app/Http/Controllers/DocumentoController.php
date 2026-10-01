<?php

namespace App\Http\Controllers;

use App\Models\DocumentoEmitido;
use App\Models\Inscripcion;
use App\Support\Reportes\DatosReporte;
use App\Support\Reportes\ImpresionPdf;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Official documents handed to an alumno: issuing a boleta or constancia takes the next folio and keeps a
 * copy of what was printed; it can be downloaded again from that copy, and the Admin can void it.
 */
class DocumentoController extends Controller
{
    use AuthorizesRequests;

    /**
     * Issue a boleta or constancia for an enrollment and open its PDF.
     */
    public function store(Request $request, Inscripcion $inscripcion): RedirectResponse
    {
        $grupo = $inscripcion->grupo()->withTrashed()->firstOrFail();
        $this->authorize('report', $grupo);

        $validated = $request->validate([
            'tipo' => ['required', Rule::in(array_keys(DocumentoEmitido::PREFIJOS))],
            'firmante' => ['nullable', 'string', Rule::in(DatosReporte::firmantes($grupo->plantel_id))],
        ]);

        if ($validated['tipo'] === 'constancia' && $inscripcion->estado !== 'egresado') {
            throw ValidationException::withMessages(['tipo' => 'La constancia solo se emite a un alumno egresado del curso.']);
        }

        // With one director the signature is theirs; with several the dialog asks which one signs.
        $firmante = $validated['firmante'] ?? null;
        $firmantes = DatosReporte::firmantes($grupo->plantel_id);
        $firmante ??= count($firmantes) === 1 ? $firmantes[0] : null;

        $documento = DB::transaction(fn () => DocumentoEmitido::create([
            'tipo' => $validated['tipo'],
            'folio' => DocumentoEmitido::siguienteFolio($validated['tipo'], today()->year),
            'codigo' => DocumentoEmitido::nuevoCodigo(),
            'inscripcion_id' => $inscripcion->id,
            'datos' => [
                ...($validated['tipo'] === 'boleta' ? DatosReporte::boleta($inscripcion) : DatosReporte::constancia($inscripcion)),
                'emitido_por' => $request->user()->name,
            ],
            'firmante' => $firmante,
            'emitido_por' => $request->user()->id,
        ]));

        return to_route('documentos.pdf', $documento);
    }

    /**
     * Download an issued document again, from its copy: no new folio.
     */
    public function pdf(DocumentoEmitido $documento): Response
    {
        $this->authorize('view', $documento);

        return ImpresionPdf::documento($documento);
    }

    /**
     * Void a document (its verification page then says so). Its folio is never reused.
     */
    public function anular(Request $request, DocumentoEmitido $documento): RedirectResponse
    {
        $this->authorize('void', $documento);

        $validated = $request->validate(['motivo' => ['required', 'string', 'max:255']]);

        $documento->update([
            'anulado_en' => now(),
            'anulado_por' => $request->user()->id,
            'motivo_anulacion' => $validated['motivo'],
        ]);

        return back();
    }
}
