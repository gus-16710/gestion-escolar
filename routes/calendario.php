<?php

use App\Http\Controllers\DiaSinClaseController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::get('calendario', [DiaSinClaseController::class, 'index'])->name('calendario.index');
    Route::post('calendario', [DiaSinClaseController::class, 'store'])->name('calendario.store');
    Route::put('calendario/{diaSinClase}', [DiaSinClaseController::class, 'update'])->name('calendario.update');
    Route::delete('calendario/{diaSinClase}', [DiaSinClaseController::class, 'destroy'])->name('calendario.destroy');
});
