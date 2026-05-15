<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\StatusCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatusCatalogController extends Controller
{
    use AuthorizesPrivileged;

    public function index(Request $request): JsonResponse
    {
        $q = StatusCatalog::query()->orderBy('sort_order')->orderBy('label');
        if ($request->filled('category')) {
            $q->where('category', $request->input('category'));
        }

        return response()->json($q->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'category' => ['required', 'string', 'max:64'],
            'code' => ['required', 'string', 'max:64'],
            'label' => ['required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        return response()->json(StatusCatalog::query()->create($data), 201);
    }

    public function update(Request $request, StatusCatalog $statusCatalog): JsonResponse
    {
        $this->authorizePrivileged($request);
        $statusCatalog->update($request->validate([
            'category' => ['sometimes', 'required', 'string', 'max:64'],
            'code' => ['sometimes', 'required', 'string', 'max:64'],
            'label' => ['sometimes', 'required', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]));

        return response()->json($statusCatalog->fresh());
    }

    public function destroy(Request $request, StatusCatalog $statusCatalog): JsonResponse
    {
        $this->authorizePrivileged($request);
        $statusCatalog->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
