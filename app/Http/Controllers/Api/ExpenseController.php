<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Expense::query()->with(['area:id,name', 'project:id,name', 'client:id,legal_name', 'financialCategory', 'responsibleUser:id,name']);
        AreaVisibility::applyExpenseScope($q, $request->user());

        if ($request->filled('area_id')) {
            $q->where('area_id', (int) $request->input('area_id'));
        }
        if ($request->filled('project_id')) {
            $q->where('project_id', (int) $request->input('project_id'));
        }
        if ($request->filled('from')) {
            $q->whereDate('recorded_on', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('recorded_on', '<=', $request->input('to'));
        }

        return response()->json($q->orderByDesc('recorded_on')->paginate(40));
    }

    public function show(Request $request, Expense $expense): JsonResponse
    {
        $this->assertExpense($request, $expense);

        return response()->json($expense->load(['client', 'project', 'area', 'financialCategory', 'responsibleUser']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'area_id' => ['required', 'integer', 'exists:areas,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'financial_category_id' => ['required', 'integer', 'exists:financial_categories,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'recorded_on' => ['required', 'date'],
            'responsible_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'observation' => ['nullable', 'string'],
        ]);

        return response()->json(Expense::query()->create($data), 201);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $this->assertExpense($request, $expense);
        $data = $request->validate([
            'area_id' => ['sometimes', 'required', 'integer', 'exists:areas,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'client_id' => ['nullable', 'integer', 'exists:clients,id'],
            'financial_category_id' => ['sometimes', 'required', 'integer', 'exists:financial_categories,id'],
            'amount' => ['sometimes', 'numeric', 'min:0'],
            'recorded_on' => ['sometimes', 'date'],
            'responsible_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'observation' => ['nullable', 'string'],
        ]);
        $expense->update($data);

        return response()->json($expense->fresh()->load(['area', 'project']));
    }

    public function destroy(Request $request, Expense $expense): JsonResponse
    {
        $this->assertExpense($request, $expense);
        $expense->delete();

        return response()->json(null, 204);
    }

    private function assertExpense(Request $request, Expense $expense): void
    {
        $q = Expense::query()->whereKey($expense->id);
        AreaVisibility::applyExpenseScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }
}
