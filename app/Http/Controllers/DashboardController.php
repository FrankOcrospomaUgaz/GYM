<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardService $dashboard): Response
    {
        $user = $request->user();

        return response()
            ->view('apex', [
                'metrics' => $dashboard->payload($user),
                'authUser' => $user ? $user->authPayload() : null,
            ])
            ->header('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate')
            ->header('Pragma', 'no-cache');
    }
}
