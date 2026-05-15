<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\CrmActivity;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmActivityController extends Controller
{
    public function index(Request $request, Client $client): JsonResponse
    {
        $this->assertClient($request, $client);
        $q = CrmActivity::query()->where('client_id', $client->id)->with('user:id,name')->orderByDesc('occurred_at');
        AreaVisibility::applyCrmActivityScope($q, $request->user());

        return response()->json($q->paginate(40));
    }

    public function store(Request $request, Client $client): JsonResponse
    {
        $this->assertClient($request, $client);
        $data = $request->validate([
            'type' => ['required', 'string', 'max:64'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'occurred_at' => ['nullable', 'date'],
            'next_followup_at' => ['nullable', 'date'],
        ]);
        $data['client_id'] = $client->id;
        $data['user_id'] = $request->user()?->id;

        return response()->json(CrmActivity::query()->create($data), 201);
    }

    public function destroy(Request $request, Client $client, CrmActivity $activity): JsonResponse
    {
        $this->assertClient($request, $client);
        $q = CrmActivity::query()->whereKey($activity->id)->where('client_id', $client->id);
        AreaVisibility::applyCrmActivityScope($q, $request->user());
        $row = $q->first();
        if ($row === null) {
            abort(404);
        }
        $row->delete();

        return response()->json(null, 204);
    }

    private function assertClient(Request $request, Client $client): void
    {
        $q = Client::query()->whereKey($client->id);
        AreaVisibility::applyClientScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }
}
