<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientContact;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientContactController extends Controller
{
    public function store(Request $request, Client $client): JsonResponse
    {
        $this->assertClient($request, $client);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
        ]);
        $data['client_id'] = $client->id;

        return response()->json(ClientContact::query()->create($data), 201);
    }

    public function update(Request $request, Client $client, ClientContact $contact): JsonResponse
    {
        $this->assertClient($request, $client);
        if ($contact->client_id !== $client->id) {
            abort(404);
        }
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
        ]);
        $contact->update($data);

        return response()->json($contact->fresh()->load('area'));
    }

    public function destroy(Request $request, Client $client, ClientContact $contact): JsonResponse
    {
        $this->assertClient($request, $client);
        if ($contact->client_id !== $client->id) {
            abort(404);
        }
        $contact->delete();

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
