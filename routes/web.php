<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GymController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function (): void {
    Route::get('/login', DashboardController::class)->name('login');
    Route::post('/api/auth/login', [AuthController::class, 'login']);
});

Route::middleware('auth')->group(function (): void {
    Route::post('/api/auth/logout', [AuthController::class, 'logout']);
    Route::get('/api/auth/me', [AuthController::class, 'me']);

    Route::prefix('api/gym')->group(function (): void {
        Route::get('dashboard', [GymController::class, 'dashboard']);
        Route::get('branches', [GymController::class, 'branches']);
        Route::get('plans', [GymController::class, 'plans']);
        Route::post('plans', [GymController::class, 'storePlan']);
        Route::put('plans/{plan}', [GymController::class, 'updatePlan']);
        Route::delete('plans/{plan}', [GymController::class, 'destroyPlan']);
        Route::get('members', [GymController::class, 'members']);
        Route::post('members', [GymController::class, 'storeMember']);
        Route::put('members/{member}', [GymController::class, 'updateMember']);
        Route::get('memberships', [GymController::class, 'memberships']);
        Route::post('memberships', [GymController::class, 'sellMembership']);
        Route::get('payments', [GymController::class, 'payments']);
        Route::get('attendance', [GymController::class, 'attendance']);
        Route::post('attendance/check-in', [GymController::class, 'checkIn']);
        Route::get('classes', [GymController::class, 'classes']);
        Route::get('equipment', [GymController::class, 'equipment']);
        Route::match(['get', 'post'], 'expenses', [GymController::class, 'expenses']);
        Route::get('notifications', [GymController::class, 'notifications']);
    });

    Route::get('/{any?}', DashboardController::class)->where('any', '.*');
});
