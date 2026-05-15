<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Income;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IncomeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Income::query()->with(['client:id,legal_name', 'project:id,name', 'area:id,name', 'financialCategory', 'quotation']);
        AreaVisibility::applyIncomeScope($q, $request->user());

        if ($request->filled('area_id')) {
            $q->where('area_id', (int) $request->input('area_id'));
        }
        if ($request->filled('client_id')) {
            $q->where('client_id', (int) $request->input('client_id'));
        }
        if ($request->filled('project_id')) {
            $q->where('project_id', (int) $request->input('project_id'));
        }
        if ($request->filled('payment_status')) {
            $q->where('payment_status', $request->input('payment_status'));
        }
        if ($request->filled('from')) {
            $q->whereDate('recorded_on', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('recorded_on', '<=', $request->input('to'));
        }

        return response()->json($q->orderByDesc('recorded_on')->paginate(40));
    }

    public function show(Request $request, Income $income): JsonResponse
    {
        $this->assertIncome($request, $income);

        return response()->json($income->load(['client', 'project', 'area', 'financialCategory', 'quotation']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'area_id' => ['required', 'integer', 'exists:areas,id'],
            'financial_category_id' => ['required', 'integer', 'exists:financial_categories,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'recorded_on' => ['required', 'date'],
            'payment_status' => ['nullable', 'string', 'max:64'],
            'quotation_id' => ['nullable', 'integer', 'exists:quotations,id'],
            'description' => ['nullable', 'string'],
        ]);

        return response()->json(Income::query()->create($data), 201);
    }

    public function update(Request $request, Income $income): JsonResponse
    {
        $this->assertIncome($request, $income);
        $data = $request->validate([
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'area_id' => ['sometimes', 'required', 'integer', 'exists:areas,id'],
            'financial_category_id' => ['sometimes', 'required', 'integer', 'exists:financial_categories,id'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'recorded_on' => ['sometimes', 'date'],
            'payment_status' => ['nullable', 'string', 'max:64'],
            'quotation_id' => ['nullable', 'integer', 'exists:quotations,id'],
            'description' => ['nullable', 'string'],
        ]);
        $income->update($data);

        return response()->json($income->fresh()->load(['client', 'project', 'area']));
    }

    public function destroy(Request $request, Income $income): JsonResponse
    {
        $this->assertIncome($request, $income);
        $income->update(['payment_status' => 'annulled']);

        return response()->json(null, 204);
    }

    private function assertIncome(Request $request, Income $income): void
    {
        $q = Income::query()->whereKey($income->id);
        AreaVisibility::applyIncomeScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }
}
