<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Tras Nginx/Ingress HTTPS, sin esto Laravel puede ver HTTP y las cookies/session no encajan bien.
        $middleware->trustProxies(at: '*');
        $middleware->alias([
            'superadmin' => \App\Http\Middleware\EnsureSuperadmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
