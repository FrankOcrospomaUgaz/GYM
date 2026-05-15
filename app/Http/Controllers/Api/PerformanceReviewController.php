<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Concerns\AuthorizesPrivileged;
use App\Models\PerformanceReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerformanceReviewController extends Controller
{
    use AuthorizesPrivileged;

    public function index(Request $request): JsonResponse
    {
        $q = PerformanceReview::query()->with(['user:id,name', 'reviewer:id,name'])->orderByDesc('period');
        if ($request->filled('user_id')) {
            $q->where('user_id', (int) $request->input('user_id'));
        }

        return response()->json($q->paginate(40));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizePrivileged($request);
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'reviewer_id' => ['nullable', 'integer', 'exists:users,id'],
            'period' => ['required', 'string', 'max:64'],
            'score' => ['nullable', 'integer', 'min:1', 'max:10'],
            'comments' => ['nullable', 'string'],
        ]);

        return response()->json(PerformanceReview::query()->create($data), 201);
    }

    public function update(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->authorizePrivileged($request);
        $performanceReview->update($request->validate([
            'reviewer_id' => ['nullable', 'integer', 'exists:users,id'],
            'period' => ['sometimes', 'required', 'string', 'max:64'],
            'score' => ['nullable', 'integer', 'min:1', 'max:10'],
            'comments' => ['nullable', 'string'],
        ]));

        return response()->json($performanceReview->fresh()->load(['user', 'reviewer']));
    }

    public function destroy(Request $request, PerformanceReview $performanceReview): JsonResponse
    {
        $this->authorizePrivileged($request);
        $performanceReview->delete();

        return response()->json(null, 204);
    }
}
