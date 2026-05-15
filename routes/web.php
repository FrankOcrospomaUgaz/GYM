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
    Route::get('/api/reniec', [GymController::class, 'reniec'])->name('api.reniec');

    Route::prefix('api/gym')->group(function (): void {
        Route::get('dashboard', [GymController::class, 'dashboard']);
        Route::get('branches', [GymController::class, 'branches']);
        Route::get('fitness-goals', [GymController::class, 'fitnessGoals']);
        Route::post('fitness-goals', [GymController::class, 'storeFitnessGoal']);
        Route::get('plans', [GymController::class, 'plans']);
        Route::post('plans', [GymController::class, 'storePlan']);
        Route::put('plans/{plan}', [GymController::class, 'updatePlan']);
        Route::delete('plans/{plan}', [GymController::class, 'destroyPlan']);
        Route::get('members', [GymController::class, 'members']);
        Route::post('members', [GymController::class, 'storeMember']);
        Route::put('members/{member}', [GymController::class, 'updateMember']);
        Route::delete('members/{member}', [GymController::class, 'destroyMember']);
        Route::get('members/{member}/memberships', [GymController::class, 'memberMemberships']);
        Route::get('memberships', [GymController::class, 'memberships']);
        Route::post('memberships', [GymController::class, 'sellMembership']);
        Route::get('payments', [GymController::class, 'payments']);
        Route::get('attendance', [GymController::class, 'attendance']);
        Route::post('attendance/check-in', [GymController::class, 'checkIn']);
        Route::get('classes', [GymController::class, 'classes']);
        Route::get('training-subscriptions', [GymController::class, 'trainingSubscriptions']);
        Route::post('training-subscriptions', [GymController::class, 'storeTrainingSubscription']);
        Route::put('training-subscriptions/{subscription}', [GymController::class, 'updateTrainingSubscription']);
        Route::delete('training-subscriptions/{subscription}', [GymController::class, 'destroyTrainingSubscription']);
        Route::post('classes', [GymController::class, 'storeClass']);
        Route::put('classes/{class}', [GymController::class, 'updateClass']);
        Route::delete('classes/{class}', [GymController::class, 'destroyClass']);
        Route::get('classes/{class}/bookings', [GymController::class, 'classBookings']);
        Route::post('classes/{class}/bookings', [GymController::class, 'storeClassBooking']);
        Route::post('class-bookings/{booking}/check-in', [GymController::class, 'checkInClassBooking']);
        Route::post('class-bookings/{booking}/cancel', [GymController::class, 'cancelClassBooking']);
        Route::get('equipment', [GymController::class, 'equipment']);
        Route::match(['get', 'post'], 'expenses', [GymController::class, 'expenses']);
        Route::get('notifications', [GymController::class, 'notifications']);
        Route::get('saas', [GymController::class, 'saas']);
        Route::post('saas/tenants', [GymController::class, 'storeTenant']);
        Route::put('saas/tenants/{tenant}', [GymController::class, 'updateTenant']);
        Route::post('saas/tenants/{tenant}/modules', [GymController::class, 'updateTenantModules']);
        Route::post('saas/users', [GymController::class, 'storeTenantUser']);
        Route::post('saas/branches', [GymController::class, 'storeBranch']);
    });

    Route::get('/{any?}', DashboardController::class)->where('any', '.*');
});
