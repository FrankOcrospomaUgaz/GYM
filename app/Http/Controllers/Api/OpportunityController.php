<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Opportunity;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpportunityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Opportunity::query()->with(['client:id,legal_name,trade_name', 'area:id,name']);
        AreaVisibility::applyOpportunityScope($q, $request->user());

        if ($request->filled('stage')) {
            $q->where('stage', $request->input('stage'));
        }

        return response()->json($q->orderByDesc('id')->paginate(30));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'stage' => ['nullable', 'string', 'max:64'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_amount' => ['nullable', 'numeric', 'min:0'],
            'expected_close' => ['nullable', 'date'],
            'next_followup_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $this->assertClientVisible($request, (int) $data['client_id']);

        return response()->json(Opportunity::query()->create($data), 201);
    }

    public function update(Request $request, Opportunity $opportunity): JsonResponse
    {
        $this->scopeOne($request, $opportunity);
        $data = $request->validate([
            'client_id' => ['sometimes', 'required', 'integer', 'exists:clients,id'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'owner_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'stage' => ['nullable', 'string', 'max:64'],
            'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
            'expected_amount' => ['nullable', 'numeric', 'min:0'],
            'expected_close' => ['nullable', 'date'],
            'next_followup_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
        $opportunity->update($data);

        return response()->json($opportunity->fresh()->load(['client', 'area']));
    }

    public function destroy(Request $request, Opportunity $opportunity): JsonResponse
    {
        $this->scopeOne($request, $opportunity);
        $opportunity->delete();

        return response()->json(null, 204);
    }

    private function scopeOne(Request $request, Opportunity $opportunity): void
    {
        $q = Opportunity::query()->whereKey($opportunity->id);
        AreaVisibility::applyOpportunityScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }

    private function assertClientVisible(Request $request, int $clientId): void
    {
        $q = Client::query()->whereKey($clientId);
        AreaVisibility::applyClientScope($q, $request->user());
        if (! $q->exists()) {
            abort(422, 'Cliente fuera del alcance de su usuario.');
        }
    }
}
