<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Client::query()->with('areas:id,name,slug');
        AreaVisibility::applyClientScope($q, $request->user());

        if ($request->filled('area_id')) {
            $areaId = (int) $request->input('area_id');
            $q->whereHas('areas', fn ($b) => $b->where('areas.id', $areaId));
        }

        if ($request->filled('q')) {
            $s = '%'.$request->string('q').'%';
            $q->where(function ($w) use ($s) {
                $w->where('legal_name', 'like', $s)->orWhere('trade_name', 'like', $s)->orWhere('ruc', 'like', $s);
            });
        }

        $perPage = (int) $request->input('per_page', 30);

        return response()->json($q->orderByDesc('id')->paginate(max(5, min(200, $perPage))));
    }

    public function show(Request $request, Client $client): JsonResponse
    {
        $this->assertClientScope($request, $client);

        return response()->json($client->load([
            'areas',
            'contacts.area',
            'crmActivities' => fn ($r) => $r->orderByDesc('occurred_at')->limit(100),
            'opportunities',
        ]));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'legal_name' => ['required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'ruc' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'sector' => ['nullable', 'string', 'max:255'],
            'company_size' => ['nullable', 'string', 'max:255'],
            'client_type' => ['nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'pipeline_stage' => ['nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
            'area_ids' => ['required', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
        ]);

        $client = DB::transaction(function () use ($data) {
            $areaIds = $data['area_ids'];
            unset($data['area_ids']);
            $c = Client::query()->create($data);
            $c->areas()->sync($areaIds);

            return $c;
        });

        return response()->json($client->load('areas'), 201);
    }

    public function update(Request $request, Client $client): JsonResponse
    {
        $this->assertClientScope($request, $client);
        $data = $request->validate([
            'legal_name' => ['sometimes', 'required', 'string', 'max:255'],
            'trade_name' => ['nullable', 'string', 'max:255'],
            'ruc' => ['nullable', 'string', 'max:32'],
            'address' => ['nullable', 'string', 'max:500'],
            'phone' => ['nullable', 'string', 'max:64'],
            'email' => ['nullable', 'email', 'max:255'],
            'sector' => ['nullable', 'string', 'max:255'],
            'company_size' => ['nullable', 'string', 'max:255'],
            'client_type' => ['nullable', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'pipeline_stage' => ['nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
            'area_ids' => ['sometimes', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
        ]);

        DB::transaction(function () use ($client, $data) {
            $areaIds = $data['area_ids'] ?? null;
            unset($data['area_ids']);
            $client->update($data);
            if (is_array($areaIds)) {
                $client->areas()->sync($areaIds);
            }
        });

        return response()->json($client->fresh()->load('areas'));
    }

    public function destroy(Request $request, Client $client): JsonResponse
    {
        $this->assertClientScope($request, $client);
        $client->update(['is_active' => false]);

        return response()->json(null, 204);
    }

    public function searchRuc(string $ruc): JsonResponse
    {
        $url = env('APIRENIEC_URL_RUC');
        $token = env('APIRENIEC_KEY');

        $response = \Illuminate\Support\Facades\Http::get($url, [
            'document' => $ruc,
            'key' => $token,
        ]);

        if ($response->successful()) {
            return response()->json($response->json());
        }

        return response()->json([
            'error' => 'No se pudo consultar el RUC',
            'details' => $response->json(),
        ], $response->status());
    }

    private function assertClientScope(Request $request, Client $client): void
    {
        $q = Client::query()->whereKey($client->id);
        AreaVisibility::applyClientScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }
}
