<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = User::query()
            ->with(['role:id,name,slug', 'cargo:id,name', 'areas:id,name']);

        $scope = $request->string('scope')->toString();
        if ($scope === 'admins') {
            $q->where('is_superadmin', true);
        } elseif ($scope === 'users') {
            $q->where('is_superadmin', false);
        }

        if ($request->filled('q')) {
            $s = '%'.$request->string('q').'%';
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', $s)->orWhere('email', 'like', $s);
            });
        }

        $sort = $request->string('sort', 'id')->toString();
        $allowed = ['id', 'name', 'email', 'created_at'];
        if (! in_array($sort, $allowed, true)) {
            $sort = 'id';
        }
        $dir = strtolower($request->string('dir', 'desc')->toString()) === 'asc' ? 'asc' : 'desc';
        $q->orderBy($sort, $dir);

        $perPage = max(5, min(100, (int) $request->input('per_page', 50)));

        return response()->json($q->paginate($perPage));
    }

    public function show(User $user): JsonResponse
    {
        return response()->json($user->load(['role', 'cargo', 'areas:id,name']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'is_superadmin' => ['sometimes', 'boolean'],
            'role_id' => ['sometimes', 'nullable', 'exists:roles,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
            'phone' => ['nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'contract_type' => ['nullable', 'string', 'max:255'],
            'salary' => ['nullable', 'numeric', 'min:0'],
            'cost_per_hour' => ['nullable', 'numeric', 'min:0'],
            'availability' => ['nullable', 'string', 'max:255'],
            'specialty' => ['nullable', 'string'],
            'area_ids' => ['sometimes', 'array'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'project_ids' => ['sometimes', 'array'],
            'project_ids.*' => ['integer', 'exists:projects,id'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $areaIds = $data['area_ids'] ?? [];
            $projectIds = $data['project_ids'] ?? [];
            unset($data['area_ids'], $data['project_ids']);

            $password = $data['password'];
            unset($data['password']);

            $u = User::query()->create([
                ...$data,
                'password' => $password,
            ]);

            $u->areas()->sync($areaIds);
            if ($projectIds !== []) {
                $u->projects()->sync($projectIds);
            }

            return $u;
        });

        return response()->json($user->load(['role', 'cargo', 'areas']), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'is_superadmin' => ['sometimes', 'boolean'],
            'role_id' => ['sometimes', 'nullable', 'exists:roles,id'],
            'cargo_id' => ['nullable', 'exists:cargos,id'],
            'phone' => ['nullable', 'string', 'max:64'],
            'is_active' => ['sometimes', 'boolean'],
            'contract_type' => ['nullable', 'string', 'max:255'],
            'salary' => ['nullable', 'numeric', 'min:0'],
            'cost_per_hour' => ['nullable', 'numeric', 'min:0'],
            'availability' => ['nullable', 'string', 'max:255'],
            'specialty' => ['nullable', 'string'],
            'area_ids' => ['sometimes', 'array'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'project_ids' => ['sometimes', 'array'],
            'project_ids.*' => ['integer', 'exists:projects,id'],
        ]);

        if (array_key_exists('is_superadmin', $data) && $user->is_superadmin && ! $data['is_superadmin']) {
            $superadmins = User::query()->where('is_superadmin', true)->count();
            if ($superadmins <= 1) {
                return response()->json([
                    'message' => 'Debe existir al menos un superadmin.',
                ], 422);
            }
        }

        DB::transaction(function () use ($user, $data, $request) {
            $areaIds = $data['area_ids'] ?? null;
            unset($data['area_ids']);

            $projectIds = $data['project_ids'] ?? null;
            unset($data['project_ids']);

            if (! empty($data['password'])) {
                $user->password = $data['password'];
            }
            unset($data['password']);

            $user->fill($data);
            $user->save();

            if (is_array($areaIds)) {
                $user->areas()->sync($areaIds);
            }
            if (is_array($projectIds)) {
                $user->projects()->sync($projectIds);
            }
        });

        return response()->json($user->fresh()->load(['role', 'cargo', 'areas']));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->is_superadmin) {
            return response()->json([
                'message' => 'No se puede eliminar al superadmin.',
            ], 422);
        }

        if ((int) $request->user()->id === (int) $user->id) {
            return response()->json([
                'message' => 'No puede eliminar su propio usuario.',
            ], 422);
        }

        $user->delete();

        return response()->json(null, 204);
    }
}
