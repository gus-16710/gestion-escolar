<?php

use App\Http\Controllers\DocumentoController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\VerificacionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('reportes', [ReporteController::class, 'index'])->name('reportes.index');
    Route::get('grupos/{grupo}/reportes/concentrado', [ReporteController::class, 'concentrado'])->name('reportes.concentrado');
    Route::get('grupos/{grupo}/reportes/asistencia', [ReporteController::class, 'asistencia'])->name('reportes.asistencia');

    Route::post('inscripciones/{inscripcion}/documentos', [DocumentoController::class, 'store'])->name('documentos.store');
    Route::get('documentos/{documento}/pdf', [DocumentoController::class, 'pdf'])->name('documentos.pdf');
    Route::patch('documentos/{documento}/anular', [DocumentoController::class, 'anular'])->name('documentos.anular');
});

// Public: the QR printed on boletas and constancias opens it, so it needs no session.
Route::get('verificar/{codigo}', VerificacionController::class)->middleware('throttle:30,1')->name('verificacion.show');
