<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\Cargo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CargoController extends Controller
{
    use AuthorizesPrivileged;

    public function index(): JsonResponse
    {
        return response()->json(Cargo::query()->where('is_active', true)->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(Cargo::query()->create($data), 201);
    }

    public function update(Request $request, Cargo $cargo): JsonResponse
    {
        $this->authorizePrivileged($request);
        $cargo->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        return response()->json($cargo->fresh());
    }

    public function destroy(Request $request, Cargo $cargo): JsonResponse
    {
        $this->authorizePrivileged($request);
        $cargo->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
