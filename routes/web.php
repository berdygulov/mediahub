<?php

use App\Http\Controllers\Admin\LogController as AdminLogController;
use App\Http\Controllers\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Files
    Route::get('files', [FileController::class, 'index'])->name('files.index');
    Route::get('files/{id}', [FileController::class, 'show'])->name('files.show');
    Route::get('files/{id}/download', [FileController::class, 'download'])->name('files.download');
    Route::delete('files/{id}', [FileController::class, 'destroy'])->name('files.destroy');

    // Folders
    Route::get('folders', [FolderController::class, 'index'])->name('folders.index');
    Route::get('folders/{id}', [FolderController::class, 'show'])->name('folders.show');
    Route::post('folders', [FolderController::class, 'store'])->name('folders.store');
    Route::delete('folders/{id}', [FolderController::class, 'destroy'])->name('folders.destroy');

    // Upload
    Route::get('upload', [UploadController::class, 'create'])->name('upload.create');
    Route::post('upload', [UploadController::class, 'store'])->name('upload.store');

    // Search
    Route::get('search', [SearchController::class, 'index'])->name('search.index');
});

// Admin
Route::middleware(['auth', 'verified', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('users', [AdminUserController::class, 'index'])->name('users.index');
    Route::patch('users/{id}', [AdminUserController::class, 'update'])->name('users.update');
    Route::delete('users/{id}', [AdminUserController::class, 'destroy'])->name('users.destroy');
    Route::get('logs', [AdminLogController::class, 'index'])->name('logs.index');
    Route::get('settings', [AdminSettingController::class, 'index'])->name('settings.index');
    Route::patch('settings', [AdminSettingController::class, 'update'])->name('settings.update');
});

require __DIR__.'/settings.php';
