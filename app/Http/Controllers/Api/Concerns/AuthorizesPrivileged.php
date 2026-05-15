<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\User;
use Illuminate\Http\Request;

trait AuthorizesPrivileged
{
    protected function authorizePrivileged(Request $request): User
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }
        $user->loadMissing('role');
        if (! $user->isSuperadmin() && ($user->role === null || $user->role->slug !== 'admin')) {
            abort(403);
        }

        return $user;
    }
}
