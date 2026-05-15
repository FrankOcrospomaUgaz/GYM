<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\TaxRate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaxRateController extends Controller
{
    use AuthorizesPrivileged;

    public function index(): JsonResponse
    {
        return response()->json(TaxRate::query()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rate_percent' => ['required', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(TaxRate::query()->create($data), 201);
    }

    public function update(Request $request, TaxRate $taxRate): JsonResponse
    {
        $this->authorizePrivileged($request);
        $taxRate->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'rate_percent' => ['sometimes', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        return response()->json($taxRate->fresh());
    }

    public function destroy(Request $request, TaxRate $taxRate): JsonResponse
    {
        $this->authorizePrivileged($request);
        $taxRate->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
