<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceCatalogController extends Controller
{
    use AuthorizesPrivileged;

    public function index(Request $request): JsonResponse
    {
        $q = Service::query()->with('area:id,name')->orderBy('name');
        if ($request->boolean('active_only', true)) {
            $q->where('is_active', true);
        }
        if ($request->filled('area_id')) {
            $q->where('area_id', (int) $request->input('area_id'));
        }

        return response()->json($q->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(Service::query()->create($data), 201);
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $this->authorizePrivileged($request);
        $service->update($request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'area_id' => ['nullable', 'integer', 'exists:areas,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]));

        return response()->json($service->fresh()->load('area'));
    }

    public function destroy(Request $request, Service $service): JsonResponse
    {
        $this->authorizePrivileged($request);
        $service->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
