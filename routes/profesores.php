<?php

use App\Http\Controllers\ProfesorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::resource('profesores', ProfesorController::class)
        ->parameters(['profesores' => 'profesor'])
        ->except(['show']);
});
