<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TimeEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = TimeEntry::query()->with(['user:id,name', 'project:id,name', 'client:id,legal_name', 'area:id,name']);
        AreaVisibility::applyTimeEntryScope($q, $request->user());

        if ($request->filled('status')) {
            $q->where('status', $request->input('status'));
        }
        if ($request->filled('from')) {
            $q->whereDate('work_date', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $q->whereDate('work_date', '<=', $request->input('to'));
        }

        return response()->json($q->orderByDesc('work_date')->paginate(40));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'area_id' => ['required', 'integer', 'exists:areas,id'],
            'work_date' => ['required', 'date'],
            'started_at' => ['nullable', 'date_format:H:i'],
            'ended_at' => ['nullable', 'date_format:H:i'],
            'hours' => ['required', 'numeric', 'min:0.01', 'max:24'],
            'description' => ['nullable', 'string'],
            'billable' => ['sometimes', 'boolean'],
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        $project = Project::query()->with('client')->findOrFail($data['project_id']);
        $this->assertProject($request, $project);

        $uid = $data['user_id'] ?? $request->user()?->id;
        if ($uid === null) {
            abort(422, 'Usuario requerido.');
        }
        if ($uid !== $request->user()?->id && ! AreaVisibility::canSeeAll($request->user())) {
            abort(403);
        }

        unset($data['user_id']);

        $data['user_id'] = $uid;
        $data['client_id'] = $project->client_id;
        $data['status'] = 'pending';

        return response()->json(TimeEntry::query()->create($data), 201);
    }

    public function update(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->assertEntry($request, $timeEntry);
        $data = $request->validate([
            'work_date' => ['sometimes', 'date'],
            'started_at' => ['nullable', 'date_format:H:i'],
            'ended_at' => ['nullable', 'date_format:H:i'],
            'hours' => ['sometimes', 'numeric', 'min:0.01', 'max:24'],
            'description' => ['nullable', 'string'],
            'billable' => ['sometimes', 'boolean'],
            'area_id' => ['sometimes', 'integer', 'exists:areas,id'],
        ]);
        if ($timeEntry->user_id !== $request->user()?->id && ! AreaVisibility::canSeeAll($request->user())) {
            abort(403);
        }
        $timeEntry->update($data);

        return response()->json($timeEntry->fresh()->load(['project', 'client', 'area']));
    }

    public function review(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        if (! AreaVisibility::canSeeAll($request->user()) && $request->user()?->role?->slug !== 'gerente_area') {
            abort(403);
        }
        $this->assertEntry($request, $timeEntry);
        $data = $request->validate([
            'status' => ['required', 'string', 'in:approved,rejected'],
        ]);
        $timeEntry->update(['status' => $data['status']]);

        return response()->json($timeEntry->fresh());
    }

    public function destroy(Request $request, TimeEntry $timeEntry): JsonResponse
    {
        $this->assertEntry($request, $timeEntry);
        if ($timeEntry->user_id !== $request->user()?->id && ! AreaVisibility::canSeeAll($request->user())) {
            abort(403);
        }
        $timeEntry->delete();

        return response()->json(null, 204);
    }

    private function assertEntry(Request $request, TimeEntry $timeEntry): void
    {
        $q = TimeEntry::query()->whereKey($timeEntry->id);
        AreaVisibility::applyTimeEntryScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }

    private function assertProject(Request $request, Project $project): void
    {
        $q = Project::query()->whereKey($project->id);
        AreaVisibility::applyProjectScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }
}
