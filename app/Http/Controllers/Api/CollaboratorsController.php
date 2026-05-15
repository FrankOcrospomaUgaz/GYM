<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollaboratorsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $auth = $request->user()?->loadMissing(['role', 'areas']);
        if ($auth === null) {
            abort(401);
        }

        $q = User::query()
            ->select(['users.id', 'users.name', 'users.email', 'users.cost_per_hour'])
            ->where('users.is_active', true)
            ->with('areas:id,name');

        if (! AreaVisibility::canSeeAll($auth)) {
            $ids = AreaVisibility::userAreaIds($auth);
            if ($ids === []) {
                return response()->json([]);
            }

            $q->whereHas('areas', fn ($b) => $b->whereIn('areas.id', $ids));
        }

        return response()->json($q->orderBy('users.name')->limit(350)->get());
    }
}
