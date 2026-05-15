<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\Currency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    use AuthorizesPrivileged;

    public function index(): JsonResponse
    {
        return response()->json(Currency::query()->orderBy('code')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:8'],
            'name' => ['required', 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:8'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(Currency::query()->create($data), 201);
    }

    public function update(Request $request, Currency $currency): JsonResponse
    {
        $this->authorizePrivileged($request);
        $currency->update($request->validate([
            'code' => ['sometimes', 'required', 'string', 'max:8'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'symbol' => ['nullable', 'string', 'max:8'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        return response()->json($currency->fresh());
    }

    public function destroy(Request $request, Currency $currency): JsonResponse
    {
        $this->authorizePrivileged($request);
        $currency->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
