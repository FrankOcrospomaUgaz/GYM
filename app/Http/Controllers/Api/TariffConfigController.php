<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\TariffConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TariffConfigController extends Controller
{
    use AuthorizesPrivileged;

    public function index(): JsonResponse
    {
        return response()->json(TariffConfig::query()->with(['currency', 'area'])->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rate_type' => ['required', 'string', 'max:64'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency_id' => ['nullable', 'integer', 'exists:currencies,id'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(TariffConfig::query()->create($data), 201);
    }

    public function update(Request $request, TariffConfig $tariffConfig): JsonResponse
    {
        $this->authorizePrivileged($request);
        $tariffConfig->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'rate_type' => ['sometimes', 'required', 'string', 'max:64'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'currency_id' => ['nullable', 'integer', 'exists:currencies,id'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        return response()->json($tariffConfig->fresh()->load(['currency', 'area']));
    }

    public function destroy(Request $request, TariffConfig $tariffConfig): JsonResponse
    {
        $this->authorizePrivileged($request);
        $tariffConfig->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
