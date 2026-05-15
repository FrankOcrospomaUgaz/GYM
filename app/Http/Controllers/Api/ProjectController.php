<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Project::query()->with(['client:id,legal_name', 'areas:id,name', 'leadUser:id,name']);
        AreaVisibility::applyProjectScope($q, $request->user());

        if ($request->filled('area_id')) {
            $aid = (int) $request->input('area_id');
            $q->whereHas('areas', fn ($b) => $b->where('areas.id', $aid));
        }
        if ($request->filled('status')) {
            $q->where('status', $request->input('status'));
        }

        if ($request->filled('q')) {
            $s = '%'.$request->string('q').'%';
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', $s)
                    ->orWhere('service_type', 'like', $s)
                    ->orWhereHas('client', fn ($c) => $c->where('legal_name', 'like', $s));
            });
        }

        $sort = $request->string('sort', 'id')->toString();
        $allowed = ['id', 'name', 'status', 'start_date', 'created_at', 'client'];
        if (! in_array($sort, $allowed, true)) {
            $sort = 'id';
        }
        $dir = strtolower($request->string('dir', 'desc')->toString()) === 'asc' ? 'asc' : 'desc';
        if ($sort === 'client') {
            $q->select('projects.*')
                ->leftJoin('clients', 'clients.id', '=', 'projects.client_id')
                ->orderBy('clients.legal_name', $dir)
                ->orderByDesc('projects.id');
        } else {
            $q->orderBy($sort, $dir);
        }

        $perPage = max(5, min(100, (int) $request->input('per_page', 30)));

        return response()->json($q->paginate($perPage));
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->assertProject($request, $project);

        return response()->json($project->load(['client', 'areas', 'users', 'leadUser']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'name' => ['required', 'string', 'max:255'],
            'service_type' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_estimated' => ['nullable', 'date'],
            'end_actual' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:64'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'deliverables' => ['nullable', 'string'],
            'area_ids' => ['required', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $project = DB::transaction(function () use ($data) {
            $aids = $data['area_ids'];
            $uids = $data['user_ids'] ?? [];
            unset($data['area_ids'], $data['user_ids']);
            $p = Project::query()->create($data);
            $p->areas()->sync($aids);
            $p->users()->sync($uids);

            return $p;
        });

        return response()->json($project->load(['areas', 'users']), 201);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        $this->assertProject($request, $project);
        $data = $request->validate([
            'client_id' => ['sometimes', 'required', 'integer', 'exists:clients,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'service_type' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_estimated' => ['nullable', 'date'],
            'end_actual' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'max:64'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'description' => ['nullable', 'string'],
            'objectives' => ['nullable', 'string'],
            'deliverables' => ['nullable', 'string'],
            'area_ids' => ['sometimes', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'user_ids' => ['sometimes', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        DB::transaction(function () use ($project, $data) {
            $aids = $data['area_ids'] ?? null;
            $uids = $data['user_ids'] ?? null;
            unset($data['area_ids'], $data['user_ids']);
            $project->update($data);
            if (is_array($aids)) {
                $project->areas()->sync($aids);
            }
            if (is_array($uids)) {
                $project->users()->sync($uids);
            }
        });

        return response()->json($project->fresh()->load(['areas', 'users', 'client']));
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->assertProject($request, $project);
        $project->update(['status' => 'cancelled']);

        return response()->json(null, 204);
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
