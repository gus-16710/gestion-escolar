<?php

use App\Http\Controllers\PlantelController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::resource('planteles', PlantelController::class)
        ->parameters(['planteles' => 'plantel'])
        ->except(['show']);
});
