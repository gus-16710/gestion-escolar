<?php

use App\Http\Controllers\Admin\DirectorController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'role:Admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('users', UserController::class)->except(['show']);
    Route::resource('roles', RoleController::class)->except(['show']);
    Route::get('permissions', [PermissionController::class, 'index'])->name('permissions.index');
});

// Directores is a top-level module in the sidebar (next to Profesores), gated by its own permission.
Route::middleware(['auth', 'permission:manage directors'])->prefix('admin')->name('admin.')->group(function () {
    Route::resource('directores', DirectorController::class)
        ->parameters(['directores' => 'director'])
        ->except(['show']);
});
