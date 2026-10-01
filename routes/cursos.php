<?php

use App\Http\Controllers\CursoController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::resource('cursos', CursoController::class)->except(['show']);
});
