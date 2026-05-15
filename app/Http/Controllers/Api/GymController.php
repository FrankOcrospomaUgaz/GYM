<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class GymController extends Controller
{
    private const MODULES = [
        'dashboard' => 'Panel',
        'members' => 'Socios',
        'plans' => 'Planes',
        'memberships' => 'Membresías',
        'attendance' => 'Accesos',
        'classes' => 'Clases',
        'finance' => 'Caja',
        'equipment' => 'Equipos',
    ];

    private function isSystemAdmin(?User $user): bool
    {
        return (bool) ($user?->is_superadmin);
    }

    private function tenantId(Request $request): ?int
    {
        $user = $request->user();
        if ($this->isSystemAdmin($user) && $request->filled('tenant_id')) {
            return (int) $request->query('tenant_id');
        }

        return $user?->tenant_id ? (int) $user->tenant_id : null;
    }

    private function defaultTenantId(Request $request): ?int
    {
        return $this->tenantId($request) ?? DB::table('gym_tenants')->orderBy('id')->value('id');
    }

    private function scopeTenant($query, Request $request, string $table)
    {
        $tenantId = $this->tenantId($request);
        if ($tenantId !== null) {
            $query->where($table.'.tenant_id', $tenantId);
        } elseif (! $this->isSystemAdmin($request->user())) {
            $query->whereRaw('1 = 0');
        }

        return $query;
    }

    private function scopeBranches($query, Request $request, string $table): void
    {
        $user = $request->user();
        if ($this->isSystemAdmin($user)) {
            return;
        }

        $branchIds = DB::table('gym_branch_user')->where('user_id', $user?->id)->pluck('branch_id')->all();
        if ($user?->branch_id) {
            $branchIds[] = (int) $user->branch_id;
        }

        if ($branchIds !== [] && $user?->role?->slug !== 'admin') {
            $query->whereIn($table.'.branch_id', array_values(array_unique($branchIds)));
        }
    }

    private function branchIdForWrite(Request $request, mixed $branchId): ?int
    {
        $tenantId = $this->defaultTenantId($request);
        $branchId = $branchId ? (int) $branchId : ((int) ($request->user()?->branch_id ?? 0) ?: null);

        if ($branchId === null) {
            return DB::table('gym_branches')->where('tenant_id', $tenantId)->orderBy('id')->value('id');
        }

        $query = DB::table('gym_branches')->where('id', $branchId);
        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        abort_unless($query->exists(), 422, 'La sede seleccionada no pertenece al cliente activo.');

        return $branchId;
    }

    private function enabledModules(Request $request): array
    {
        if ($this->isSystemAdmin($request->user())) {
            return array_keys(self::MODULES);
        }

        $tenantId = $this->tenantId($request);
        if ($tenantId === null) {
            return [];
        }

        return DB::table('gym_tenant_modules')
            ->where('tenant_id', $tenantId)
            ->where('is_enabled', true)
            ->pluck('module')
            ->all();
    }

    private function requireSystemAdmin(Request $request): void
    {
        abort_unless($this->isSystemAdmin($request->user()), 403, 'Solo el administrador del sistema puede realizar esta acción.');
    }

    public function dashboard(Request $request): JsonResponse
    {
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();
        $monthEnd = $today->copy()->endOfMonth();

        $payments = $this->scopeTenant(DB::table('gym_payments'), $request, 'gym_payments');
        $expensesQuery = $this->scopeTenant(DB::table('gym_expenses'), $request, 'gym_expenses');
        $membershipsQuery = $this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships');
        $membersQuery = $this->scopeTenant(DB::table('gym_members'), $request, 'gym_members');
        $attendanceQuery = $this->scopeTenant(DB::table('gym_attendances'), $request, 'gym_attendances');
        $notificationsQuery = $this->scopeTenant(DB::table('gym_notifications'), $request, 'gym_notifications');

        $income = (float) $payments
            ->where('status', 'paid')
            ->whereBetween('paid_on', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $expenses = (float) $expensesQuery
            ->whereBetween('spent_on', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $expiring = $membershipsQuery
            ->where('status', 'active')
            ->whereBetween('ends_on', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->count();

        return response()->json([
            'kpis' => [
                ['label' => 'Socios activos', 'value' => $membersQuery->where('status', 'active')->count(), 'hint' => 'Clientes con estado activo'],
                ['label' => 'Ingresos del mes', 'value' => 'S/ '.number_format($income, 2), 'hint' => 'Pagos confirmados'],
                ['label' => 'Utilidad estimada', 'value' => 'S/ '.number_format($income - $expenses, 2), 'hint' => 'Ingresos menos gastos'],
                ['label' => 'Por vencer', 'value' => $expiring, 'hint' => 'Membresías próximos 7 días'],
            ],
            'attendance_today' => $attendanceQuery->whereDate('checked_in_at', $today->toDateString())->count(),
            'plan_mix' => $this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
                ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
                ->select('gym_plans.name', DB::raw('count(*) as total'))
                ->where('gym_memberships.status', 'active')
                ->groupBy('gym_plans.name')
                ->get(),
            'notifications' => $notificationsQuery->whereNull('read_at')->latest()->limit(6)->get(),
            'enabled_modules' => $this->enabledModules($request),
        ]);
    }

    public function members(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = $this->scopeTenant(DB::table('gym_members'), $request, 'gym_members')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_members.branch_id')
            ->select('gym_members.*', 'gym_branches.name as branch_name')
            ->orderByDesc('gym_members.id');
        $this->scopeBranches($query, $request, 'gym_members');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('dni', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%")
                    ->orWhere('member_code', 'like', "%{$search}%");
            });
        }

        return response()->json($query->limit(80)->get());
    }

    public function storeMember(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'document_type' => ['required', 'string', 'max:20'],
            'dni' => ['required', 'digits:8', Rule::unique('gym_members', 'dni')],
            'document_number' => ['nullable', 'string', 'max:30', Rule::unique('gym_members', 'document_number')],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'birthdate' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:180'],
            'emergency_contact_name' => ['nullable', 'string', 'max:100'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'medical_notes' => ['nullable', 'string'],
            'fitness_goal' => ['nullable', 'string'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
        ]);

        $data['tenant_id'] = $this->defaultTenantId($request);
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['document_number'] = $data['document_number'] ?? $data['dni'];
        $nextId = ((int) DB::table('gym_members')->max('id')) + 1;
        $data['member_code'] = 'M-'.str_pad((string) $nextId, 4, '0', STR_PAD_LEFT);
        $data['status'] = 'active';
        $data['created_by'] = $request->user()?->id;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('gym_members')->insertGetId($data);

        return response()->json(DB::table('gym_members')->find($id), 201);
    }

    public function updateMember(Request $request, int $member): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'document_type' => ['required', 'string', 'max:20'],
            'dni' => ['required', 'digits:8', Rule::unique('gym_members', 'dni')->ignore($member)],
            'document_number' => ['nullable', 'string', 'max:30', Rule::unique('gym_members', 'document_number')->ignore($member)],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['required', 'string', 'max:30'],
            'birthdate' => ['nullable', 'date'],
            'gender' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:180'],
            'emergency_contact_name' => ['nullable', 'string', 'max:100'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
            'medical_notes' => ['nullable', 'string'],
            'fitness_goal' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'inactive', 'blocked'])],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
        ]);
        $data['document_number'] = $data['document_number'] ?? $data['dni'];
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['updated_at'] = now();

        $this->scopeTenant(DB::table('gym_members')->where('id', $member), $request, 'gym_members')->update($data);

        return response()->json(DB::table('gym_members')->find($member));
    }

    public function destroyMember(Request $request, int $member): JsonResponse
    {
        $hasHistory = DB::table('gym_memberships')->where('member_id', $member)->exists()
            || DB::table('gym_payments')->where('member_id', $member)->exists()
            || DB::table('gym_attendances')->where('member_id', $member)->exists();

        if ($hasHistory) {
            DB::table('gym_members')->where('id', $member)->update([
                'status' => 'inactive',
                'updated_at' => now(),
            ]);

            return response()->json([
                'ok' => true,
                'mode' => 'deactivated',
                'message' => 'El socio tiene historial; se desactivó para conservar auditoría.',
            ]);
        }

        $this->scopeTenant(DB::table('gym_members')->where('id', $member), $request, 'gym_members')->delete();

        return response()->json(['ok' => true, 'mode' => 'deleted']);
    }

    public function plans(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_plans'), $request, 'gym_plans')->orderBy('price')->get());
    }

    public function fitnessGoals(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_fitness_goals'), $request, 'gym_fitness_goals')->where('is_active', true)->orderBy('name')->get());
    }

    public function storeFitnessGoal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('gym_fitness_goals', 'name')],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
        $data['tenant_id'] = $this->defaultTenantId($request);
        $data['is_active'] = true;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('gym_fitness_goals')->insertGetId($data);

        return response()->json(DB::table('gym_fitness_goals')->find($id), 201);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $data = $this->validatePlan($request);
        $data['tenant_id'] = $this->defaultTenantId($request);
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('gym_plans')->insertGetId($data);

        return response()->json(DB::table('gym_plans')->find($id), 201);
    }

    public function updatePlan(Request $request, int $plan): JsonResponse
    {
        $data = $this->validatePlan($request, $plan);
        $data['updated_at'] = now();

        $this->scopeTenant(DB::table('gym_plans')->where('id', $plan), $request, 'gym_plans')->update($data);

        return response()->json(DB::table('gym_plans')->find($plan));
    }

    public function destroyPlan(Request $request, int $plan): JsonResponse
    {
        $hasMemberships = DB::table('gym_memberships')->where('plan_id', $plan)->exists();

        if ($hasMemberships) {
            $this->scopeTenant(DB::table('gym_plans')->where('id', $plan), $request, 'gym_plans')->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);

            return response()->json([
                'ok' => true,
                'mode' => 'deactivated',
                'message' => 'El plan tiene membresías asociadas; se desactivó para conservar histórico.',
            ]);
        }

        $this->scopeTenant(DB::table('gym_plans')->where('id', $plan), $request, 'gym_plans')->delete();

        return response()->json(['ok' => true, 'mode' => 'deleted']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePlan(Request $request, ?int $planId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:30', Rule::unique('gym_plans', 'code')->ignore($planId)],
            'price' => ['required', 'numeric', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'grace_days' => ['required', 'integer', 'min:0', 'max:365'],
            'daily_access_limit' => ['nullable', 'integer', 'min:1', 'max:24'],
            'includes_classes' => ['required', 'boolean'],
            'includes_trainer' => ['required', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    public function branches(Request $request): JsonResponse
    {
        $query = $this->scopeTenant(DB::table('gym_branches'), $request, 'gym_branches')->where('is_active', true)->orderBy('name');
        $this->scopeBranches($query, $request, 'gym_branches');

        return response()->json($query->get());
    }

    public function reniec(Request $request): JsonResponse
    {
        $dni = (string) $request->query('dni', '');

        if (! preg_match('/^\d{8}$/', $dni)) {
            return response()->json([
                'status' => false,
                'message' => 'DNI inválido.',
            ], 422);
        }

        $response = Http::timeout(15)->get((string) config('apireniec.url'), [
            'document' => $dni,
            'key' => (string) config('apireniec.key'),
        ]);

        if (! $response->successful()) {
            return response()->json([
                'status' => false,
                'message' => 'No se pudo consultar RENIEC.',
            ], 422);
        }

        $data = (array) $response->json();
        $estado = (bool) ($data['estado'] ?? $data['status'] ?? false);
        $resultado = (array) ($data['resultado'] ?? []);
        $mensaje = (string) ($data['mensaje'] ?? $data['message'] ?? '');

        if ($estado && $resultado === []) {
            $hasPersonFields = ($data['nombres'] ?? '') !== ''
                || ($data['apellido_paterno'] ?? '') !== ''
                || ($data['apellido_materno'] ?? '') !== ''
                || ($data['nombre_completo'] ?? '') !== ''
                || ($data['name'] ?? '') !== '';

            if ($hasPersonFields) {
                $resultado = $data;
            }
        }

        if (! $estado || $resultado === []) {
            return response()->json([
                'status' => false,
                'message' => $mensaje !== '' ? $mensaje : 'No se encontró información en RENIEC.',
            ], 422);
        }

        $id = (string) ($resultado['id'] ?? $dni);
        $nombres = trim((string) ($resultado['nombres'] ?? ''));
        $apellidoPaterno = trim((string) ($resultado['apellido_paterno'] ?? ($resultado['apellidoPaterno'] ?? '')));
        $apellidoMaterno = trim((string) ($resultado['apellido_materno'] ?? ($resultado['apellidoMaterno'] ?? '')));
        $codigoVerificacion = trim((string) ($resultado['codigo_verificacion'] ?? ($resultado['codigoVerificacion'] ?? '')));
        $fechaNacimiento = $this->normalizeReniecDate((string) ($resultado['fecha_nacimiento'] ?? ($resultado['fechaNacimiento'] ?? '')));
        $genero = $this->normalizeReniecGender((string) ($resultado['genero'] ?? ($resultado['sexo'] ?? '')));

        if ($nombres === '' && $apellidoPaterno === '' && $apellidoMaterno === '') {
            $full = trim((string) ($resultado['nombre_completo'] ?? ($resultado['name'] ?? '')));
            if ($full !== '') {
                $parts = preg_split('/\s+/', $full) ?: [];
                if (count($parts) >= 4) {
                    $nombres = trim(implode(' ', array_slice($parts, 0, count($parts) - 2)));
                    $apellidoPaterno = (string) ($parts[count($parts) - 2] ?? '');
                    $apellidoMaterno = (string) ($parts[count($parts) - 1] ?? '');
                } elseif (count($parts) === 3) {
                    $nombres = (string) ($parts[0] ?? '');
                    $apellidoPaterno = (string) ($parts[1] ?? '');
                    $apellidoMaterno = (string) ($parts[2] ?? '');
                } elseif (count($parts) === 2) {
                    $nombres = (string) ($parts[0] ?? '');
                    $apellidoPaterno = (string) ($parts[1] ?? '');
                } elseif (count($parts) === 1) {
                    $nombres = (string) ($parts[0] ?? '');
                }
            }
        }

        $nombreCompleto = trim(implode(' ', array_filter([$nombres, $apellidoPaterno, $apellidoMaterno])));
        if ($nombreCompleto === '') {
            return response()->json([
                'status' => false,
                'message' => 'No se encontró información en RENIEC.',
            ], 422);
        }

        $apellidosUnificados = trim(implode(' ', array_filter([$apellidoPaterno, $apellidoMaterno])));

        return response()->json([
            'status' => true,
            'message' => $mensaje !== '' ? $mensaje : 'Encontrado',
            'id' => $id,
            'nombres' => $nombres,
            'apellido_paterno' => $apellidoPaterno,
            'apellido_materno' => $apellidoMaterno,
            'nombre_completo' => (string) ($resultado['nombre_completo'] ?? $nombreCompleto),
            'codigo_verificacion' => $codigoVerificacion,
            'fecha_nacimiento' => $fechaNacimiento,
            'genero' => $genero,
            'first_name' => $nombres,
            'last_name' => $apellidosUnificados,
            'name' => $nombreCompleto,
        ]);
    }

    public function sellMembership(Request $request): JsonResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'exists:gym_members,id'],
            'plan_id' => ['required', 'exists:gym_plans,id'],
            'starts_on' => ['required', 'date'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'method' => ['required', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin'])],
            'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'notes' => ['nullable', 'string'],
        ]);

        $tenantId = $this->defaultTenantId($request);
        abort_unless(DB::table('gym_members')->where('id', $data['member_id'])->where('tenant_id', $tenantId)->exists(), 422, 'El socio no pertenece al cliente activo.');
        $plan = DB::table('gym_plans')->where('id', $data['plan_id'])->where('tenant_id', $tenantId)->first();
        abort_unless($plan !== null, 422, 'El plan no pertenece al cliente activo.');
        $starts = Carbon::parse($data['starts_on']);
        $discount = (float) ($data['discount'] ?? 0);
        $amount = max(0, (float) $plan->price - $discount);

        $proofPath = $data['method'] !== 'cash' && $request->hasFile('proof_photo')
            ? $request->file('proof_photo')?->store('payment-proofs', 'public')
            : null;

        return DB::transaction(function () use ($request, $data, $plan, $tenantId, $starts, $discount, $amount, $proofPath): JsonResponse {
            DB::table('gym_memberships')->where('member_id', $data['member_id'])->where('status', 'active')->update(['status' => 'replaced', 'updated_at' => now()]);
            $membershipId = DB::table('gym_memberships')->insertGetId([
                'tenant_id' => $tenantId,
                'member_id' => $data['member_id'],
                'plan_id' => $data['plan_id'],
                'starts_on' => $starts->toDateString(),
                'ends_on' => $starts->copy()->addDays((int) $plan->duration_days)->toDateString(),
                'price' => $plan->price,
                'discount' => $discount,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
                'sold_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $paymentId = DB::table('gym_payments')->insertGetId([
                'tenant_id' => $tenantId,
                'member_id' => $data['member_id'],
                'membership_id' => $membershipId,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $amount,
                'method' => $data['method'],
                'proof_path' => $proofPath,
                'status' => 'paid',
                'paid_on' => now()->toDateString(),
                'notes' => 'Venta de membresía',
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['membership_id' => $membershipId, 'payment_id' => $paymentId], 201);
        });
    }

    public function memberships(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->select('gym_memberships.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"), 'gym_plans.name as plan_name')
            ->orderByDesc('gym_memberships.id')
            ->limit(100)
            ->get());
    }

    public function memberMemberships(Request $request, int $member): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->select('gym_memberships.*', 'gym_plans.name as plan_name')
            ->where('gym_memberships.member_id', $member)
            ->orderByDesc('gym_memberships.id')
            ->get());
    }

    public function payments(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_payments'), $request, 'gym_payments')
            ->join('gym_members', 'gym_members.id', '=', 'gym_payments.member_id')
            ->select('gym_payments.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"))
            ->orderByDesc('gym_payments.id')
            ->limit(100)
            ->get()
            ->map(function ($payment) {
                $payment->proof_url = $payment->proof_path ? Storage::disk('public')->url($payment->proof_path) : null;

                return $payment;
            }));
    }

    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'exists:gym_members,id'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
        ]);

        $membership = DB::table('gym_memberships')
            ->where('member_id', $data['member_id'])
            ->where('status', 'active')
            ->whereDate('starts_on', '<=', now()->toDateString())
            ->whereDate('ends_on', '>=', now()->toDateString())
            ->first();

        $id = DB::table('gym_attendances')->insertGetId([
            'tenant_id' => $this->defaultTenantId($request),
            'member_id' => $data['member_id'],
            'branch_id' => $this->branchIdForWrite($request, $data['branch_id'] ?? DB::table('gym_members')->where('id', $data['member_id'])->value('branch_id')),
            'checked_in_at' => now(),
            'source' => 'manual',
            'result' => $membership ? 'allowed' : 'blocked',
            'notes' => $membership ? 'Acceso autorizado' : 'Sin membresía activa',
            'registered_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('gym_attendances')->find($id), $membership ? 201 : 422);
    }

    public function attendance(Request $request): JsonResponse
    {
        $query = $this->scopeTenant(DB::table('gym_attendances'), $request, 'gym_attendances')
            ->join('gym_members', 'gym_members.id', '=', 'gym_attendances.member_id')
            ->select('gym_attendances.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"))
            ->orderByDesc('checked_in_at');
        $this->scopeBranches($query, $request, 'gym_attendances');

        return response()->json($query->limit(80)->get());
    }

    public function classes(Request $request): JsonResponse
    {
        $query = $this->scopeTenant(DB::table('gym_classes'), $request, 'gym_classes')
            ->leftJoin('users', 'users.id', '=', 'gym_classes.trainer_id')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_classes.branch_id')
            ->select('gym_classes.*', 'users.name as trainer_name', 'gym_branches.name as branch_name')
            ->orderBy('weekday')
            ->orderBy('starts_at');
        $this->scopeBranches($query, $request, 'gym_classes');

        return response()->json($query->get());
    }

    public function trainingSubscriptions(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_training_subscriptions'), $request, 'gym_training_subscriptions')
            ->join('gym_members', 'gym_members.id', '=', 'gym_training_subscriptions.member_id')
            ->leftJoin('gym_payments', 'gym_payments.training_subscription_id', '=', 'gym_training_subscriptions.id')
            ->select(
                'gym_training_subscriptions.*',
                DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"),
                'gym_members.dni',
                'gym_payments.id as payment_id',
                'gym_payments.receipt_number as payment_receipt_number',
                'gym_payments.amount as payment_amount',
                'gym_payments.method as payment_method_recorded',
                'gym_payments.status as payment_status',
                'gym_payments.paid_on as payment_paid_on',
                'gym_payments.proof_path as payment_proof_path'
            )
            ->orderByDesc('gym_training_subscriptions.id')
            ->limit(100)
            ->get()
            ->map(function ($subscription) {
                $subscription->selected_days = json_decode((string) $subscription->selected_days, true) ?: [];
                $subscription->day_schedules = json_decode((string) ($subscription->day_schedules ?? ''), true) ?: [];
                $proofPath = $subscription->payment_proof_path ?: $subscription->proof_path;
                $subscription->proof_url = $proofPath ? Storage::disk('public')->url($proofPath) : null;

                return $subscription;
            })
            ->unique(fn ($subscription) => implode('|', [
                $subscription->member_id,
                $subscription->discipline,
                $subscription->starts_on,
                json_encode($subscription->selected_days),
                json_encode($subscription->day_schedules),
                $subscription->status,
            ]))
            ->values());
    }

    public function storeTrainingSubscription(Request $request): JsonResponse
    {
        [$data, $starts, $selectedDays, $daySchedules, $preferredTime] = $this->validatedTrainingSubscription($request);
        abort_unless(DB::table('gym_members')->where('id', $data['member_id'])->where('tenant_id', $this->defaultTenantId($request))->exists(), 422, 'El socio no pertenece al cliente activo.');
        $tenantId = $this->defaultTenantId($request);
        $this->abortIfDuplicateTrainingSubscription($tenantId, (int) $data['member_id'], (string) $data['discipline'], $starts->toDateString(), $selectedDays, $daySchedules);
        $proofPath = $data['payment_method'] !== 'cash' && $request->hasFile('proof_photo')
            ? $request->file('proof_photo')?->store('training-subscription-proofs', 'public')
            : null;

        return DB::transaction(function () use ($request, $data, $tenantId, $starts, $selectedDays, $daySchedules, $preferredTime, $proofPath): JsonResponse {
            $id = DB::table('gym_training_subscriptions')->insertGetId([
                'tenant_id' => $tenantId,
                'member_id' => $data['member_id'],
                'discipline' => $data['discipline'],
                'monthly_fee' => $data['monthly_fee'],
                'starts_on' => $starts->toDateString(),
                'ends_on' => $starts->copy()->addMonthNoOverflow()->subDay()->toDateString(),
                'selected_days' => json_encode($selectedDays),
                'day_schedules' => json_encode(collect($daySchedules)->only($selectedDays)->all()),
                'preferred_time' => $preferredTime,
                'sessions_per_week' => $data['sessions_per_week'],
                'payment_method' => $data['payment_method'],
                'proof_path' => $proofPath,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $paymentId = DB::table('gym_payments')->insertGetId([
                'tenant_id' => $tenantId,
                'member_id' => $data['member_id'],
                'training_subscription_id' => $id,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $data['monthly_fee'],
                'method' => $data['payment_method'],
                'proof_path' => $proofPath,
                'status' => 'paid',
                'paid_on' => now()->toDateString(),
                'notes' => 'Pago de mensualidad de clases',
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['subscription_id' => $id, 'payment_id' => $paymentId], 201);
        });
    }

    public function updateTrainingSubscription(Request $request, int $subscription): JsonResponse
    {
        [$data, $starts, $selectedDays, $daySchedules, $preferredTime] = $this->validatedTrainingSubscription($request);
        abort_unless(DB::table('gym_members')->where('id', $data['member_id'])->where('tenant_id', $this->defaultTenantId($request))->exists(), 422, 'El socio no pertenece al cliente activo.');
        $this->abortIfDuplicateTrainingSubscription($this->defaultTenantId($request), (int) $data['member_id'], (string) $data['discipline'], $starts->toDateString(), $selectedDays, $daySchedules, $subscription);

        $current = $this->scopeTenant(DB::table('gym_training_subscriptions')->where('id', $subscription), $request, 'gym_training_subscriptions')->first();
        abort_unless($current !== null, 404, 'Mensualidad no encontrada.');

        $proofPath = $data['payment_method'] === 'cash'
            ? null
            : ($request->hasFile('proof_photo') ? $request->file('proof_photo')?->store('training-subscription-proofs', 'public') : $current->proof_path);

        $payload = [
            'member_id' => $data['member_id'],
            'discipline' => $data['discipline'],
            'monthly_fee' => $data['monthly_fee'],
            'starts_on' => $starts->toDateString(),
            'ends_on' => $starts->copy()->addMonthNoOverflow()->subDay()->toDateString(),
            'selected_days' => json_encode($selectedDays),
            'day_schedules' => json_encode(collect($daySchedules)->only($selectedDays)->all()),
            'preferred_time' => $preferredTime,
            'sessions_per_week' => $data['sessions_per_week'],
            'payment_method' => $data['payment_method'],
            'proof_path' => $proofPath,
            'status' => $data['status'] ?? 'active',
            'notes' => $data['notes'] ?? null,
            'updated_at' => now(),
        ];

        $this->scopeTenant(DB::table('gym_training_subscriptions')->where('id', $subscription), $request, 'gym_training_subscriptions')->update($payload);

        $paymentPayload = [
            'tenant_id' => $this->defaultTenantId($request),
            'member_id' => $data['member_id'],
            'training_subscription_id' => $subscription,
            'amount' => $data['monthly_fee'],
            'method' => $data['payment_method'],
            'proof_path' => $proofPath,
            'status' => ($data['status'] ?? 'active') === 'cancelled' ? 'annulled' : 'paid',
            'notes' => 'Pago de mensualidad de clases',
            'registered_by' => $request->user()?->id,
            'updated_at' => now(),
        ];

        $payment = DB::table('gym_payments')->where('training_subscription_id', $subscription)->first();
        if ($payment) {
            DB::table('gym_payments')->where('id', $payment->id)->update($paymentPayload);
        } else {
            DB::table('gym_payments')->insert(array_merge($paymentPayload, [
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'paid_on' => now()->toDateString(),
                'created_at' => now(),
            ]));
        }

        return response()->json(DB::table('gym_training_subscriptions')->find($subscription));
    }

    public function destroyTrainingSubscription(Request $request, int $subscription): JsonResponse
    {
        $updated = $this->scopeTenant(DB::table('gym_training_subscriptions')->where('id', $subscription), $request, 'gym_training_subscriptions')->update([
            'status' => 'cancelled',
            'updated_at' => now(),
        ]);
        abort_unless($updated > 0, 404, 'Mensualidad no encontrada.');
        DB::table('gym_payments')->where('training_subscription_id', $subscription)->update([
            'status' => 'annulled',
            'notes' => 'Mensualidad cancelada',
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true, 'message' => 'Mensualidad cancelada correctamente.']);
    }

    private function validatedTrainingSubscription(Request $request): array
    {
        if (! $request->has('payment_method') && $request->has('method')) {
            $request->merge(['payment_method' => $request->input('method')]);
        }

        $data = $request->validate([
            'member_id' => ['required', 'exists:gym_members,id'],
            'discipline' => ['required', 'string', 'max:120'],
            'monthly_fee' => ['required', 'numeric', 'min:0.01'],
            'starts_on' => ['required', 'date'],
            'selected_days' => ['required', 'array', 'min:1'],
            'selected_days.*' => ['required', Rule::in(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])],
            'sessions_per_week' => ['required', 'integer', 'min:1', 'max:7'],
            'day_schedules' => ['required', 'json'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin'])],
            'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'status' => ['nullable', Rule::in(['active', 'inactive', 'cancelled', 'expired'])],
            'notes' => ['nullable', 'string'],
        ]);

        $starts = Carbon::parse($data['starts_on']);
        $selectedDays = array_values($data['selected_days']);
        if (count($selectedDays) !== (int) $data['sessions_per_week']) {
            abort(response()->json(['message' => 'La cantidad de días seleccionados debe coincidir con las sesiones por semana.'], 422));
        }

        $daySchedules = (array) json_decode((string) $data['day_schedules'], true);
        foreach ($selectedDays as $day) {
            $range = (array) ($daySchedules[$day] ?? []);
            $start = (string) ($range['start'] ?? '');
            $end = (string) ($range['end'] ?? '');
            if (! preg_match('/^\d{2}:\d{2}$/', $start) || ! preg_match('/^\d{2}:\d{2}$/', $end) || $end <= $start) {
                abort(response()->json(['message' => "Configure un rango horario válido para {$day}."], 422));
            }
        }

        return [$data, $starts, $selectedDays, $daySchedules, (string) (($daySchedules[$selectedDays[0]]['start'] ?? '07:00'))];
    }

    private function nextPaymentReceiptNumber(): string
    {
        return 'B001-'.str_pad((string) (((int) DB::table('gym_payments')->max('id')) + 1), 5, '0', STR_PAD_LEFT);
    }

    private function abortIfDuplicateTrainingSubscription(?int $tenantId, int $memberId, string $discipline, string $startsOn, array $selectedDays, array $daySchedules, ?int $ignoreId = null): void
    {
        $query = DB::table('gym_training_subscriptions')
            ->where('tenant_id', $tenantId)
            ->where('member_id', $memberId)
            ->where('discipline', $discipline)
            ->where('starts_on', $startsOn)
            ->whereIn('status', ['active', 'inactive']);

        if ($ignoreId !== null) {
            $query->where('id', '!=', $ignoreId);
        }

        $normalizedDays = json_encode(array_values($selectedDays));
        $normalizedSchedules = json_encode(collect($daySchedules)->only($selectedDays)->all());
        $duplicate = $query->get()->contains(function ($row) use ($normalizedDays, $normalizedSchedules): bool {
            return (string) $row->selected_days === $normalizedDays
                && (string) ($row->day_schedules ?? '') === $normalizedSchedules;
        });

        if ($duplicate) {
            abort(response()->json(['message' => 'Esta mensualidad ya existe para el socio, disciplina, fecha y horarios seleccionados.'], 422));
        }
    }

    public function storeClass(Request $request): JsonResponse
    {
        $data = $this->validateClass($request);
        $data['tenant_id'] = $this->defaultTenantId($request);
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('gym_classes')->insertGetId($data);

        return response()->json(DB::table('gym_classes')->find($id), 201);
    }

    public function updateClass(Request $request, int $class): JsonResponse
    {
        $data = $this->validateClass($request);
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['updated_at'] = now();

        $this->scopeTenant(DB::table('gym_classes')->where('id', $class), $request, 'gym_classes')->update($data);

        return response()->json(DB::table('gym_classes')->find($class));
    }

    public function destroyClass(Request $request, int $class): JsonResponse
    {
        $hasBookings = DB::table('gym_class_bookings')->where('class_id', $class)->exists();

        if ($hasBookings) {
            $this->scopeTenant(DB::table('gym_classes')->where('id', $class), $request, 'gym_classes')->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);

            return response()->json(['ok' => true, 'mode' => 'deactivated', 'message' => 'La clase tiene reservas; se desactivó para conservar histórico.']);
        }

        $this->scopeTenant(DB::table('gym_classes')->where('id', $class), $request, 'gym_classes')->delete();

        return response()->json(['ok' => true, 'mode' => 'deleted']);
    }

    public function classBookings(Request $request, int $class): JsonResponse
    {
        $date = (string) $request->query('date', now()->toDateString());

        return response()->json($this->scopeTenant(DB::table('gym_class_bookings'), $request, 'gym_class_bookings')
            ->join('gym_members', 'gym_members.id', '=', 'gym_class_bookings.member_id')
            ->select('gym_class_bookings.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"), 'gym_members.dni')
            ->where('gym_class_bookings.class_id', $class)
            ->where('gym_class_bookings.booking_date', $date)
            ->orderByDesc('gym_class_bookings.id')
            ->get());
    }

    public function storeClassBooking(Request $request, int $class): JsonResponse
    {
        $gymClass = DB::table('gym_classes')->where('id', $class)->firstOrFail();
        $data = $request->validate([
            'member_id' => ['required', 'exists:gym_members,id'],
            'booking_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);
        abort_unless((int) $gymClass->tenant_id === (int) $this->defaultTenantId($request), 422, 'La clase no pertenece al cliente activo.');
        abort_unless(DB::table('gym_members')->where('id', $data['member_id'])->where('tenant_id', $this->defaultTenantId($request))->exists(), 422, 'El socio no pertenece al cliente activo.');

        $reserved = DB::table('gym_class_bookings')
            ->where('class_id', $class)
            ->where('booking_date', $data['booking_date'])
            ->whereIn('status', ['reserved', 'attended'])
            ->count();

        if ($reserved >= (int) $gymClass->capacity) {
            return response()->json(['message' => 'La clase ya no tiene cupos disponibles.'], 422);
        }

        DB::table('gym_class_bookings')->updateOrInsert(
            ['class_id' => $class, 'member_id' => $data['member_id'], 'booking_date' => $data['booking_date']],
            ['tenant_id' => $this->defaultTenantId($request), 'status' => 'reserved', 'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['ok' => true], 201);
    }

    public function checkInClassBooking(int $booking): JsonResponse
    {
        DB::table('gym_class_bookings')->where('id', $booking)->update([
            'status' => 'attended',
            'checked_in_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function cancelClassBooking(int $booking): JsonResponse
    {
        DB::table('gym_class_bookings')->where('id', $booking)->update([
            'status' => 'cancelled',
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function equipment(Request $request): JsonResponse
    {
        $query = $this->scopeTenant(DB::table('gym_equipment'), $request, 'gym_equipment')->orderBy('next_maintenance_on');
        $this->scopeBranches($query, $request, 'gym_equipment');

        return response()->json($query->get());
    }

    /**
     * @return array<string, mixed>
     */
    private function validateClass(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'category' => ['required', 'string', 'max:80'],
            'level' => ['required', 'string', 'max:40'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
            'room' => ['nullable', 'string', 'max:120'],
            'trainer_id' => ['nullable', 'exists:users,id'],
            'weekday' => ['required', Rule::in(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])],
            'starts_at' => ['required', 'date_format:H:i'],
            'ends_at' => ['required', 'date_format:H:i', 'after:starts_at'],
            'capacity' => ['required', 'integer', 'min:1', 'max:500'],
            'color' => ['required', 'string', 'max:20'],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    public function expenses(Request $request): JsonResponse
    {
        if ($request->isMethod('post')) {
            $data = $request->validate([
                'category' => ['required', 'string', 'max:80'],
                'supplier' => ['nullable', 'string', 'max:120'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'spent_on' => ['required', 'date'],
                'payment_method' => ['required', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin'])],
                'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
                'description' => ['nullable', 'string'],
            ]);
            $data['tenant_id'] = $this->defaultTenantId($request);
            $data['proof_path'] = $data['payment_method'] !== 'cash' && $request->hasFile('proof_photo')
                ? $request->file('proof_photo')?->store('expense-proofs', 'public')
                : null;
            $data['registered_by'] = $request->user()?->id;
            $data['created_at'] = now();
            $data['updated_at'] = now();
            DB::table('gym_expenses')->insert($data);
        }

        return response()->json($this->scopeTenant(DB::table('gym_expenses'), $request, 'gym_expenses')->orderByDesc('spent_on')->limit(80)->get()->map(function ($expense) {
            $expense->proof_url = $expense->proof_path ? Storage::disk('public')->url($expense->proof_path) : null;

            return $expense;
        }));
    }

    public function notifications(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_notifications'), $request, 'gym_notifications')->orderByRaw('read_at is not null')->latest()->limit(50)->get());
    }

    public function saas(Request $request): JsonResponse
    {
        $this->requireSystemAdmin($request);

        $tenants = DB::table('gym_tenants')
            ->orderByDesc('id')
            ->get()
            ->map(function ($tenant) {
                $tenant->branches_count = DB::table('gym_branches')->where('tenant_id', $tenant->id)->count();
                $tenant->members_count = DB::table('gym_members')->where('tenant_id', $tenant->id)->count();
                $tenant->users_count = DB::table('users')->where('tenant_id', $tenant->id)->count();
                $tenant->modules = DB::table('gym_tenant_modules')->where('tenant_id', $tenant->id)->orderBy('module')->get();

                return $tenant;
            });

        return response()->json([
            'modules' => collect(self::MODULES)->map(fn ($label, $module) => ['module' => $module, 'label' => $label])->values(),
            'tenants' => $tenants,
            'users' => User::query()
                ->leftJoin('roles', 'roles.id', '=', 'users.role_id')
                ->leftJoin('gym_tenants', 'gym_tenants.id', '=', 'users.tenant_id')
                ->leftJoin('gym_branches', 'gym_branches.id', '=', 'users.branch_id')
                ->select('users.id', 'users.name', 'users.email', 'users.is_superadmin', 'users.is_active', 'users.tenant_id', 'users.branch_id', 'roles.name as role_name', 'roles.slug as role_slug', 'gym_tenants.name as tenant_name', 'gym_branches.name as branch_name')
                ->orderByDesc('users.id')
                ->limit(120)
                ->get(),
            'roles' => DB::table('roles')->select('id', 'name', 'slug')->orderBy('name')->get(),
            'branches' => DB::table('gym_branches')->select('id', 'tenant_id', 'name')->orderBy('name')->get(),
        ]);
    }

    public function storeTenant(Request $request): JsonResponse
    {
        $this->requireSystemAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:80', Rule::unique('gym_tenants', 'slug')],
            'contact_name' => ['nullable', 'string', 'max:120'],
            'contact_email' => ['nullable', 'email', 'max:120'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'plan_name' => ['required', 'string', 'max:80'],
            'billing_status' => ['required', Rule::in(['active', 'trial', 'paused', 'cancelled'])],
            'primary_color' => ['required', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $id = DB::table('gym_tenants')->insertGetId($data);
        $this->syncTenantModules($id, array_keys(self::MODULES));

        return response()->json(DB::table('gym_tenants')->find($id), 201);
    }

    public function updateTenant(Request $request, int $tenant): JsonResponse
    {
        $this->requireSystemAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'string', 'max:80', Rule::unique('gym_tenants', 'slug')->ignore($tenant)],
            'contact_name' => ['nullable', 'string', 'max:120'],
            'contact_email' => ['nullable', 'email', 'max:120'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'plan_name' => ['required', 'string', 'max:80'],
            'billing_status' => ['required', Rule::in(['active', 'trial', 'paused', 'cancelled'])],
            'primary_color' => ['required', 'string', 'max:20'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);
        $data['updated_at'] = now();
        DB::table('gym_tenants')->where('id', $tenant)->update($data);

        return response()->json(DB::table('gym_tenants')->find($tenant));
    }

    public function updateTenantModules(Request $request, int $tenant): JsonResponse
    {
        $this->requireSystemAdmin($request);
        $data = $request->validate([
            'modules' => ['required', 'array'],
            'modules.*' => ['required', Rule::in(array_keys(self::MODULES))],
        ]);
        $this->syncTenantModules($tenant, $data['modules']);

        return response()->json(['ok' => true]);
    }

    public function storeTenantUser(Request $request): JsonResponse
    {
        $this->requireSystemAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:120', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'tenant_id' => ['nullable', 'exists:gym_tenants,id'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
            'role_id' => ['nullable', 'exists:roles,id'],
            'is_superadmin' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);
        $data['password'] = Hash::make($data['password']);
        $user = User::query()->create($data);
        if ($user->branch_id) {
            DB::table('gym_branch_user')->updateOrInsert(['user_id' => $user->id, 'branch_id' => $user->branch_id]);
        }

        return response()->json($user->authPayload(), 201);
    }

    public function storeBranch(Request $request): JsonResponse
    {
        $this->requireSystemAdmin($request);
        $data = $request->validate([
            'tenant_id' => ['required', 'exists:gym_tenants,id'],
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:120'],
            'address' => ['required', 'string', 'max:180'],
            'city' => ['required', 'string', 'max:80'],
            'opening_hours' => ['nullable', 'string', 'max:180'],
            'capacity' => ['required', 'integer', 'min:1', 'max:10000'],
            'is_active' => ['required', 'boolean'],
        ]);
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $id = DB::table('gym_branches')->insertGetId($data);

        return response()->json(DB::table('gym_branches')->find($id), 201);
    }

    private function syncTenantModules(int $tenantId, array $enabledModules): void
    {
        foreach (self::MODULES as $module => $label) {
            DB::table('gym_tenant_modules')->updateOrInsert(
                ['tenant_id' => $tenantId, 'module' => $module],
                ['label' => $label, 'is_enabled' => in_array($module, $enabledModules, true), 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    private function normalizeReniecDate(string $value): string
    {
        $raw = trim($value);

        if ($raw === '') {
            return '';
        }

        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $raw, $matches)) {
            return sprintf('%s-%s-%s', $matches[3], $matches[2], $matches[1]);
        }

        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $raw, $matches)) {
            return $matches[1];
        }

        return '';
    }

    private function normalizeReniecGender(string $value): string
    {
        return match (strtoupper(trim($value))) {
            'M', 'MASCULINO', 'HOMBRE', 'MALE' => 'MASCULINO',
            'F', 'FEMENINO', 'MUJER', 'FEMALE' => 'FEMENINO',
            default => '',
        };
    }
}

