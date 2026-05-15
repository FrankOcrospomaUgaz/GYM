<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperadmin
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }
        $user->loadMissing('role');
        if ($user->isSuperadmin() || ($user->role !== null && $user->role->slug === 'admin')) {
            return $next($request);
        }

        abort(403, 'Solo el administrador del sistema puede acceder a esta operación.');
    }
}
