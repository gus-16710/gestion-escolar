<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\WelcomeController;
use Illuminate\Support\Facades\Route;

// The public site: the academic offer, upcoming openings and the planteles. Signed-in users get a link to their panel.
Route::get('/', WelcomeController::class)->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/admin.php';
require __DIR__.'/planteles.php';
require __DIR__.'/cursos.php';
require __DIR__.'/profesores.php';
require __DIR__.'/alumnos.php';
require __DIR__.'/grupos.php';
require __DIR__.'/calendario.php';
require __DIR__.'/reportes.php';
