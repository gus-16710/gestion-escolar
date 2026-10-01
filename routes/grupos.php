<?php

use App\Http\Controllers\AsistenciaController;
use App\Http\Controllers\CalificacionController;
use App\Http\Controllers\ClaseSuspendidaController;
use App\Http\Controllers\GrupoController;
use App\Http\Controllers\InscripcionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::resource('grupos', GrupoController::class);

    Route::post('grupos/{grupo}/inscripciones', [InscripcionController::class, 'store'])->name('inscripciones.store');
    Route::patch('inscripciones/{inscripcion}/baja', [InscripcionController::class, 'baja'])->name('inscripciones.baja');

    Route::get('grupos/{grupo}/asistencias', [AsistenciaController::class, 'edit'])->name('asistencias.edit');
    Route::put('grupos/{grupo}/asistencias', [AsistenciaController::class, 'update'])->name('asistencias.update');

    Route::get('grupos/{grupo}/calificaciones', [CalificacionController::class, 'index'])->name('calificaciones.index');
    Route::get('grupos/{grupo}/calificaciones/{modulo}', [CalificacionController::class, 'edit'])->name('calificaciones.edit');
    Route::put('grupos/{grupo}/calificaciones/{modulo}', [CalificacionController::class, 'update'])->name('calificaciones.update');

    Route::post('grupos/{grupo}/clases-suspendidas', [ClaseSuspendidaController::class, 'store'])->name('clases-suspendidas.store');
    Route::delete('clases-suspendidas/{claseSuspendida}', [ClaseSuspendidaController::class, 'destroy'])->name('clases-suspendidas.destroy');
});
