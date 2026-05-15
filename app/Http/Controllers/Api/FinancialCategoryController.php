<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\FinancialCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinancialCategoryController extends Controller
{
    use AuthorizesPrivileged;

    public function index(Request $request): JsonResponse
    {
        $q = FinancialCategory::query()->orderBy('type')->orderBy('name');
        if ($request->filled('type')) {
            $q->where('type', $request->input('type'));
        }

        return response()->json($q->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'in:income,expense'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(FinancialCategory::query()->create($data), 201);
    }

    public function update(Request $request, FinancialCategory $financialCategory): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'in:income,expense'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $financialCategory->update($data);

        return response()->json($financialCategory->fresh());
    }

    public function destroy(Request $request, FinancialCategory $financialCategory): JsonResponse
    {
        $this->authorizePrivileged($request);
        $financialCategory->update(['is_active' => false]);

        return response()->json(null, 204);
    }
}
