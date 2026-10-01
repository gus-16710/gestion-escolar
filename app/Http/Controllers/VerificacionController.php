<?php

namespace App\Http\Controllers;

use App\Models\DocumentoEmitido;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public page the QR of a boleta or constancia opens: anyone can check that the document exists and is
 * still valid, without signing in. It shows only what the paper already says.
 */
class VerificacionController extends Controller
{
    public function __invoke(string $codigo): Response
    {
        $documento = DocumentoEmitido::where('codigo', $codigo)->first();

        return Inertia::render('verificar', [
            'documento' => $documento ? [
                'tipo' => DocumentoEmitido::TIPOS[$documento->tipo],
                'clave_tipo' => $documento->tipo,
                'folio' => $documento->folio,
                'vigente' => $documento->vigente(),
                'anulado_en' => $documento->anulado_en?->format('Y-m-d'),
                'motivo_anulacion' => $documento->motivo_anulacion,
                'emitido_en' => $documento->created_at->format('Y-m-d'),
                'alumno' => $documento->datos['alumno']['nombre'] ?? null,
                'matricula' => $documento->datos['alumno']['matricula'] ?? null,
                'curso' => $documento->datos['curso']['nombre'] ?? null,
                'grupo' => $documento->datos['grupo']['clave'] ?? null,
                'plantel' => $documento->datos['plantel']['nombre'] ?? null,
                'promedio' => $documento->datos['promedio_final'] ?? $documento->datos['promedio_parcial'] ?? null,
                'promedio_parcial' => $documento->tipo === 'boleta' && ($documento->datos['promedio_final'] ?? null) === null,
                'resultado' => $documento->datos['estado_etiqueta'] ?? null,
            ] : null,
        ]);
    }
}
