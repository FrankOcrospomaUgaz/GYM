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
use Illuminate\Support\Facades\Schema;
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
        'products' => 'Productos',
    ];

    private function isSystemAdmin(?User $user): bool
    {
        return (bool) (optional($user)->is_superadmin);
    }

    private function tenantId(Request $request): ?int
    {
        $user = $request->user();
        if ($this->isSystemAdmin($user) && $request->filled('tenant_id')) {
            return (int) $request->query('tenant_id');
        }

        return optional($user)->tenant_id ? (int) $user->tenant_id : null;
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

    private function userBranchIds(Request $request): array
    {
        $user = $request->user();
        $branchIds = DB::table('gym_branch_user')->where('user_id', $user?->id)->pluck('branch_id')->all();
        if ($user?->branch_id) {
            $branchIds[] = (int) $user->branch_id;
        }

        return array_values(array_unique($branchIds));
    }

    private function isTenantAdmin(?User $user): bool
    {
        if ($this->isSystemAdmin($user)) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        $user->loadMissing('role');

        return $user->role?->slug === 'admin';
    }

    private function scopeBranches($query, Request $request, string $table, ?string $branchColumn = null): void
    {
        $user = $request->user();
        $branchIds = $this->userBranchIds($request);

        if ($branchIds !== []) {
            $column = $branchColumn ?? $table.'.branch_id';
            $query->whereIn($column, $branchIds);

            return;
        }

        if ($this->isTenantAdmin($user) || $this->isSystemAdmin($user)) {
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function assertMemberAccessible(Request $request, int $memberId): void
    {
        $branchIds = $this->userBranchIds($request);
        if ($branchIds === []) {
            return;
        }

        $memberBranchId = DB::table('gym_members')->where('id', $memberId)->value('branch_id');
        abort_unless(
            $memberBranchId !== null && in_array((int) $memberBranchId, $branchIds, true),
            403,
            'El socio no pertenece a su sede.'
        );
    }

    private function refreshExpiredMemberships(?int $tenantId = null, ?int $memberId = null): void
    {
        $query = DB::table('gym_memberships')
            ->where('status', 'active')
            ->whereDate('ends_on', '<', now()->toDateString());

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }
        if ($memberId !== null) {
            $query->where('member_id', $memberId);
        }

        $query->update(['status' => 'expired', 'updated_at' => now()]);
    }

    private function membershipDisplayStatus(object $membership): string
    {
        $status = (string) $membership->status;
        if ($status !== 'active') {
            return $status;
        }

        $today = now()->toDateString();
        if ((string) $membership->ends_on < $today) {
            return 'expired';
        }
        if ((string) $membership->starts_on > $today) {
            return 'pending';
        }

        return 'active';
    }

    private function enrichMembershipRow(object $membership): object
    {
        $membership->display_status = $this->membershipDisplayStatus($membership);

        return $membership;
    }

    private function replaceConflictingMemberships(int $memberId, string $startsOn, string $endsOn, ?int $exceptMembershipId = null): void
    {
        $query = DB::table('gym_memberships')
            ->where('member_id', $memberId)
            ->whereIn('status', ['active', 'expired'])
            ->where('starts_on', '<=', $endsOn)
            ->where('ends_on', '>=', $startsOn);

        if ($exceptMembershipId !== null) {
            $query->where('id', '<>', $exceptMembershipId);
        }

        $query->update(['status' => 'replaced', 'updated_at' => now()]);
    }

    private function assertMembershipSaleIsValid(Request $request, array $data, object $plan, Carbon $starts): void
    {
        $discount = (float) ($data['discount'] ?? 0);
        abort_unless($discount <= (float) $plan->price, 422, 'El descuento no puede ser mayor al precio del plan.');

        $paymentStatus = (string) $data['status'];
        if ($paymentStatus === 'credit') {
            abort_unless(filled($data['due_on'] ?? null), 422, 'Indique la fecha de vencimiento para ventas a crédito.');
            abort_unless(Carbon::parse($data['due_on'])->greaterThanOrEqualTo($starts), 422, 'La fecha de vencimiento del crédito no puede ser anterior al inicio.');
        }

        if ($paymentStatus === 'paid' && $this->paymentMethodsRequireProof($this->parsePaymentMethodsInput($request))) {
            abort_unless($request->hasFile('proof_photo'), 422, 'Adjunte el comprobante de pago para medios distintos a efectivo.');
        }
    }

    private function parsePaymentMethodsInput(Request $request, ?float $expectedTotal = null, string $legacyMethodField = 'method'): array
    {
        $raw = $request->input('payment_methods');
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : null;
        }

        if (! is_array($raw) || $raw === []) {
            $legacyMethod = $request->input($legacyMethodField);
            if (! $legacyMethod) {
                return [];
            }

            $amount = $expectedTotal ?? (float) $request->input('amount', 0);

            return [['method' => (string) $legacyMethod, 'amount' => round($amount, 2)]];
        }

        $methods = [];
        foreach ($raw as $row) {
            if (! is_array($row)) {
                continue;
            }
            $method = (string) ($row['method'] ?? '');
            abort_unless(in_array($method, ['cash', 'card', 'transfer', 'yape', 'plin'], true), 422, 'Medio de pago inválido.');
            $amount = round((float) ($row['amount'] ?? 0), 2);
            abort_unless($amount > 0, 422, 'Cada medio de pago debe tener un monto mayor a cero.');
            $methods[] = ['method' => $method, 'amount' => $amount];
        }

        abort_unless($methods !== [], 422, 'Indique al menos un medio de pago.');

        if ($expectedTotal !== null) {
            $sum = round(array_sum(array_column($methods, 'amount')), 2);
            abort_unless($sum === round($expectedTotal, 2), 422, 'La suma de medios debe coincidir con el monto total.');
        }

        return $methods;
    }

    private function primaryPaymentMethodFromSplits(array $methods): string
    {
        return count($methods) > 1 ? 'mixed' : ($methods[0]['method'] ?? 'cash');
    }

    private function paymentMethodsRequireProof(array $methods): bool
    {
        foreach ($methods as $row) {
            if (($row['method'] ?? '') !== 'cash' && (float) ($row['amount'] ?? 0) > 0) {
                return true;
            }
        }

        return false;
    }

    private function encodePaymentMethodsColumn(array $methods): ?string
    {
        return json_encode($methods, JSON_UNESCAPED_UNICODE);
    }

    private function decodePaymentMethodsColumn(mixed $raw): array
    {
        if (is_array($raw)) {
            return $raw;
        }
        if (! is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    private function applyPaymentMethodsToPaymentRow(array &$row, array $methods): void
    {
        $row['method'] = $this->primaryPaymentMethodFromSplits($methods);
        if ($this->tableHasColumn('gym_payments', 'payment_methods')) {
            $row['payment_methods'] = $this->encodePaymentMethodsColumn($methods);
        }
    }

    private function applyPaymentMethodsToExpenseRow(array &$row, array $methods): void
    {
        $row['payment_method'] = $this->primaryPaymentMethodFromSplits($methods);
        if ($this->tableHasColumn('gym_expenses', 'payment_methods')) {
            $row['payment_methods'] = $this->encodePaymentMethodsColumn($methods);
        }
    }

    private function tableHasColumn(string $table, string $column): bool
    {
        return Schema::hasTable($table) && Schema::hasColumn($table, $column);
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
        $membershipsQuery = $this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id');
        $membersQuery = $this->scopeTenant(DB::table('gym_members'), $request, 'gym_members');
        $attendanceQuery = $this->scopeTenant(DB::table('gym_attendances'), $request, 'gym_attendances');
        $notificationsQuery = $this->scopeTenant(DB::table('gym_notifications'), $request, 'gym_notifications');

        if ($this->tableHasColumn('gym_payments', 'branch_id')) {
            $this->scopeBranches($payments, $request, 'gym_payments');
        }
        if ($this->tableHasColumn('gym_expenses', 'branch_id')) {
            $this->scopeBranches($expensesQuery, $request, 'gym_expenses');
        }
        $this->scopeBranches($membershipsQuery, $request, 'gym_memberships', 'gym_members.branch_id');
        $this->scopeBranches($membersQuery, $request, 'gym_members');
        $this->scopeBranches($attendanceQuery, $request, 'gym_attendances');

        $income = (float) (clone $payments)
            ->where('status', 'paid')
            ->whereBetween('paid_on', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $receivableQuery = (clone $payments)->whereIn('status', ['pending', 'credit', 'partial']);
        $accountsReceivable = $this->tableHasColumn('gym_payments', 'amount_paid')
            ? (float) $receivableQuery->selectRaw('COALESCE(SUM(amount - COALESCE(amount_paid, 0)), 0) as total')->value('total')
            : (float) $receivableQuery->sum('amount');

        $expenses = (float) $expensesQuery
            ->whereBetween('spent_on', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $lowStockCount = 0;
        if (Schema::hasTable('gym_products')) {
            $lowStockProducts = $this->scopeTenant(DB::table('gym_products'), $request, 'gym_products')
                ->where('is_active', true)
                ->whereNotNull('min_stock')
                ->whereColumn('stock', '<=', 'min_stock');
            $this->scopeBranches($lowStockProducts, $request, 'gym_products');
            $lowStockCount = $lowStockProducts->count();
        }

        $expiring = $membershipsQuery
            ->where('gym_memberships.status', 'active')
            ->whereBetween('gym_memberships.ends_on', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->count();

        $planMixQuery = $this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->select('gym_plans.name', DB::raw('count(*) as total'))
            ->where('gym_memberships.status', 'active')
            ->groupBy('gym_plans.name');
        $this->scopeBranches($planMixQuery, $request, 'gym_memberships', 'gym_members.branch_id');

        return response()->json([
            'kpis' => [
                ['label' => 'Socios activos', 'value' => $membersQuery->where('status', 'active')->count(), 'hint' => 'Clientes con estado activo'],
                ['label' => 'Ingresos del mes', 'value' => 'S/ '.number_format($income, 2), 'hint' => 'Pagos confirmados'],
                ['label' => 'Utilidad estimada', 'value' => 'S/ '.number_format($income - $expenses, 2), 'hint' => 'Ingresos menos gastos'],
                ['label' => 'Por vencer', 'value' => $expiring, 'hint' => 'Membresías próximos 7 días'],
                ['label' => 'Por cobrar', 'value' => 'S/ '.number_format($accountsReceivable, 2), 'hint' => 'Créditos y pendientes'],
                ['label' => 'Stock bajo', 'value' => $lowStockCount, 'hint' => 'Productos en mínimo'],
            ],
            'accounts_receivable' => $accountsReceivable,
            'attendance_today' => $attendanceQuery->whereDate('checked_in_at', $today->toDateString())->count(),
            'plan_mix' => $planMixQuery->get(),
            'notifications' => $notificationsQuery->whereNull('read_at')->latest()->limit(6)->get(),
            'enabled_modules' => $this->enabledModules($request),
        ]);
    }

    public function members(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $page = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(10, (int) $request->query('per_page', 25)));

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

        if ($request->filled('status')) {
            $query->where('gym_members.status', (string) $request->query('status'));
        }

        if ($request->filled('branch_id')) {
            $query->where('gym_members.branch_id', (int) $request->query('branch_id'));
        }

        $total = $query->count();
        $rows = $query->skip(($page - 1) * $perPage)->take($perPage)->get();

        return response()->json(['rows' => $rows, 'total' => $total]);
    }

    public function storeMember(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:80'],
            'last_name' => ['required', 'string', 'max:80'],
            'document_type' => ['required', 'string', 'max:20'],
            'dni' => ['nullable', 'regex:/^(?:\d{8}|0)$/'],
            'document_number' => ['nullable', 'string', 'max:30'],
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

        if (! empty($data['dni']) && $data['dni'] !== '0' && DB::table('gym_members')->where('dni', $data['dni'])->exists()) {
            abort(422, 'El DNI ya está registrado.');
        }

        if (! empty($data['document_number']) && $data['document_number'] !== '0' && DB::table('gym_members')->where('document_number', $data['document_number'])->exists()) {
            abort(422, 'El número de documento ya está registrado.');
        }

        $data['tenant_id'] = $this->defaultTenantId($request);
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['dni'] = $data['dni'] ?? '0';
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
            'dni' => ['nullable', 'regex:/^(?:\d{8}|0)$/'],
            'document_number' => ['nullable', 'string', 'max:30'],
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
        if (! empty($data['dni']) && $data['dni'] !== '0' && DB::table('gym_members')->where('dni', $data['dni'])->where('id', '<>', $member)->exists()) {
            abort(422, 'El DNI ya está registrado.');
        }

        if (! empty($data['document_number']) && $data['document_number'] !== '0' && DB::table('gym_members')->where('document_number', $data['document_number'])->where('id', '<>', $member)->exists()) {
            abort(422, 'El número de documento ya está registrado.');
        }

        $data['dni'] = $data['dni'] ?? '0';
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
            'method' => ['nullable', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin', 'mixed'])],
            'payment_methods' => ['nullable'],
            'status' => ['required', Rule::in(['paid', 'pending', 'credit', 'courtesy'])],
            'due_on' => ['nullable', 'date'],
            'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'notes' => ['nullable', 'string'],
        ]);

        $tenantId = $this->defaultTenantId($request);
        abort_unless(DB::table('gym_members')->where('id', $data['member_id'])->where('tenant_id', $tenantId)->exists(), 422, 'El socio no pertenece al cliente activo.');
        $this->assertMemberAccessible($request, (int) $data['member_id']);
        $plan = DB::table('gym_plans')->where('id', $data['plan_id'])->where('tenant_id', $tenantId)->first();
        abort_unless($plan !== null, 422, 'El plan no pertenece al cliente activo.');
        abort_unless((bool) ($plan->is_active ?? true), 422, 'El plan no está activo para ventas.');
        $member = DB::table('gym_members')->where('id', $data['member_id'])->first();
        abort_unless($member !== null, 422, 'El socio no existe.');
        abort_if((string) $member->status === 'blocked', 422, 'El socio está bloqueado. Desbloquéelo antes de registrar la membresía.');
        $starts = Carbon::parse($data['starts_on']);
        $endsOn = $starts->copy()->addDays((int) $plan->duration_days)->toDateString();
        $data['notes'] = filled($data['notes'] ?? null) ? trim((string) $data['notes']) : null;
        $this->assertMembershipSaleIsValid($request, $data, $plan, $starts);
        $discount = (float) ($data['discount'] ?? 0);
        $amount = max(0, (float) $plan->price - $discount);

        $paymentStatus = (string) $data['status'];
        $paymentMethods = $this->parsePaymentMethodsInput($request, $amount);
        $proofPath = $paymentStatus === 'paid' && $this->paymentMethodsRequireProof($paymentMethods) && $request->hasFile('proof_photo')
            ? $request->file('proof_photo')?->store('payment-proofs', 'public')
            : null;
        $branchId = $this->branchIdForWrite($request, $this->memberBranchId((int) $data['member_id']));
        $amountPaid = in_array($paymentStatus, ['paid', 'courtesy'], true) ? $amount : 0;

        $this->refreshExpiredMemberships($tenantId, (int) $data['member_id']);

        return DB::transaction(function () use ($request, $data, $plan, $tenantId, $starts, $endsOn, $discount, $amount, $proofPath, $paymentStatus, $branchId, $amountPaid, $paymentMethods, $member): JsonResponse {
            if ((string) $member->status === 'inactive') {
                DB::table('gym_members')->where('id', $data['member_id'])->update([
                    'status' => 'active',
                    'updated_at' => now(),
                ]);
            }

            $this->replaceConflictingMemberships((int) $data['member_id'], $starts->toDateString(), $endsOn);
            $membershipId = DB::table('gym_memberships')->insertGetId([
                'tenant_id' => $tenantId,
                'member_id' => $data['member_id'],
                'plan_id' => $data['plan_id'],
                'starts_on' => $starts->toDateString(),
                'ends_on' => $endsOn,
                'price' => $plan->price,
                'discount' => $discount,
                'status' => 'active',
                'notes' => $data['notes'] ?? null,
                'sold_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $paymentRow = [
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'member_id' => $data['member_id'],
                'membership_id' => $membershipId,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $amount,
                'amount_paid' => $amountPaid,
                'proof_path' => $proofPath,
                'status' => $paymentStatus,
                'paid_on' => $starts->toDateString(),
                'due_on' => $paymentStatus === 'credit' ? ($data['due_on'] ?? $starts->copy()->addDays(7)->toDateString()) : null,
                'notes' => 'Venta de membresía'.($data['notes'] ? ' · '.$data['notes'] : ''),
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $this->applyPaymentMethodsToPaymentRow($paymentRow, $paymentMethods);
            $paymentId = DB::table('gym_payments')->insertGetId($paymentRow);

            return response()->json(['membership_id' => $membershipId, 'payment_id' => $paymentId], 201);
        });
    }

    public function memberships(Request $request): JsonResponse
    {
        $tenantId = $this->defaultTenantId($request);
        $this->refreshExpiredMemberships($tenantId);

        $query = $this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_members.branch_id')
            ->select(
                'gym_memberships.*',
                DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"),
                'gym_plans.name as plan_name',
                'gym_branches.name as branch_name',
                'gym_members.branch_id'
            )
            ->orderByDesc('gym_memberships.id');

        $this->scopeBranches($query, $request, 'gym_memberships', 'gym_members.branch_id');

        if ($request->filled('status')) {
            $query->where('gym_memberships.status', (string) $request->query('status'));
        } else {
            $query->whereNotIn('gym_memberships.status', ['replaced', 'cancelled']);
        }

        return response()->json($query->limit(150)->get()->map(fn ($row) => $this->enrichMembershipRow($row)));
    }

    public function destroyMembership(Request $request, int $membership): JsonResponse
    {
        $row = $this->scopeTenant(DB::table('gym_memberships')->where('id', $membership), $request, 'gym_memberships')->first();
        abort_unless($row !== null, 404, 'Membresía no encontrada.');

        $this->assertMemberAccessible($request, (int) $row->member_id);
        $this->refreshExpiredMemberships((int) $row->tenant_id, (int) $row->member_id);

        $activeCount = DB::table('gym_memberships')
            ->where('member_id', $row->member_id)
            ->where('id', '<>', $membership)
            ->where('status', 'active')
            ->whereDate('ends_on', '>=', now()->toDateString())
            ->count();

        if (in_array($row->status, ['active'], true) && $activeCount === 0 && (string) $row->ends_on >= now()->toDateString()) {
            abort_unless(
                $request->boolean('force'),
                422,
                'Es la única membresía vigente del socio. Confirme la cancelación forzada si aún desea anularla.'
            );
        }

        $noteSuffix = ' · Cancelada el '.now()->format('d/m/Y H:i');
        DB::table('gym_memberships')->where('id', $membership)->update([
            'status' => 'cancelled',
            'notes' => trim(($row->notes ?? '').$noteSuffix),
            'updated_at' => now(),
        ]);

        return response()->json([
            'ok' => true,
            'message' => 'Membresía cancelada correctamente.',
        ]);
    }

    public function showMembership(Request $request, int $membership): JsonResponse
    {
        $row = $this->scopeTenant(DB::table('gym_memberships')->where('id', $membership), $request, 'gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_members.branch_id')
            ->select(
                'gym_memberships.*',
                DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"),
                'gym_plans.name as plan_name',
                'gym_plans.duration_days',
                'gym_branches.name as branch_name'
            )
            ->first();

        abort_unless($row !== null, 404, 'Membresía no encontrada.');
        $this->assertMemberAccessible($request, (int) $row->member_id);

        return response()->json($this->enrichMembershipRow($row));
    }

    public function updateMembership(Request $request, int $membership): JsonResponse
    {
        $data = $request->validate([
            'plan_id' => ['sometimes', 'exists:gym_plans,id'],
            'starts_on' => ['sometimes', 'date'],
            'ends_on' => ['sometimes', 'date'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::in(['active', 'expired', 'cancelled'])],
        ]);

        $row = $this->scopeTenant(DB::table('gym_memberships')->where('id', $membership), $request, 'gym_memberships')->first();
        abort_unless($row !== null, 404, 'Membresía no encontrada.');
        abort_unless(! in_array($row->status, ['replaced', 'cancelled'], true), 422, 'No se puede editar una membresía cancelada o reemplazada.');

        $this->assertMemberAccessible($request, (int) $row->member_id);
        $tenantId = (int) $row->tenant_id;

        $planId = (int) ($data['plan_id'] ?? $row->plan_id);
        $plan = DB::table('gym_plans')->where('id', $planId)->where('tenant_id', $tenantId)->first();
        abort_unless($plan !== null, 422, 'El plan no pertenece al cliente activo.');

        $startsOn = isset($data['starts_on']) ? Carbon::parse($data['starts_on'])->toDateString() : (string) $row->starts_on;
        $endsOn = isset($data['ends_on'])
            ? Carbon::parse($data['ends_on'])->toDateString()
            : (isset($data['starts_on']) || isset($data['plan_id'])
                ? Carbon::parse($startsOn)->addDays((int) $plan->duration_days)->toDateString()
                : (string) $row->ends_on);

        abort_unless($endsOn >= $startsOn, 422, 'La fecha de fin no puede ser anterior al inicio.');

        $discount = array_key_exists('discount', $data) ? (float) $data['discount'] : (float) $row->discount;
        abort_unless($discount <= (float) $plan->price, 422, 'El descuento no puede ser mayor al precio del plan.');

        $this->refreshExpiredMemberships($tenantId, (int) $row->member_id);
        $this->replaceConflictingMemberships((int) $row->member_id, $startsOn, $endsOn, $membership);

        $update = [
            'plan_id' => $planId,
            'starts_on' => $startsOn,
            'ends_on' => $endsOn,
            'price' => $plan->price,
            'discount' => $discount,
            'updated_at' => now(),
        ];

        if (array_key_exists('notes', $data)) {
            $update['notes'] = filled($data['notes'] ?? null) ? trim((string) $data['notes']) : null;
        }
        if (isset($data['status'])) {
            $update['status'] = (string) $data['status'];
        } elseif ((string) $row->status === 'active' && $endsOn < now()->toDateString()) {
            $update['status'] = 'expired';
        }

        DB::table('gym_memberships')->where('id', $membership)->update($update);

        $payment = DB::table('gym_payments')->where('membership_id', $membership)->orderByDesc('id')->first();
        if ($payment !== null) {
            $amount = max(0, (float) $plan->price - $discount);
            DB::table('gym_payments')->where('id', $payment->id)->update([
                'amount' => $amount,
                'updated_at' => now(),
            ]);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Membresía actualizada correctamente.',
        ]);
    }

    public function memberMemberships(Request $request, int $member): JsonResponse
    {
        $this->assertMemberAccessible($request, $member);
        $tenantId = $this->defaultTenantId($request);
        $this->refreshExpiredMemberships($tenantId, $member);

        $query = $this->scopeTenant(DB::table('gym_memberships'), $request, 'gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->select('gym_memberships.*', 'gym_plans.name as plan_name')
            ->where('gym_memberships.member_id', $member)
            ->orderByDesc('gym_memberships.id');

        $this->scopeBranches($query, $request, 'gym_memberships', 'gym_members.branch_id');

        return response()->json($query->get()->map(fn ($row) => $this->enrichMembershipRow($row)));
    }

    public function payments(Request $request): JsonResponse
    {
        if ($request->isMethod('post')) {
            $data = $request->validate([
                'category' => ['required', 'string', 'max:80'],
                'concept' => ['required', 'string', 'max:160'],
                'payer_name' => ['nullable', 'string', 'max:160'],
                'member_id' => ['nullable', 'exists:gym_members,id'],
                'branch_id' => ['nullable', 'exists:gym_branches,id'],
                'amount' => ['required', 'numeric', 'min:0'],
                'paid_on' => ['required', 'date'],
                'due_on' => ['nullable', 'date'],
                'method' => ['nullable', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin', 'mixed'])],
                'payment_methods' => ['nullable'],
                'status' => ['required', Rule::in(['paid', 'pending', 'credit', 'courtesy', 'annulled'])],
                'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
                'notes' => ['nullable', 'string'],
            ]);

            $paymentStatus = (string) $data['status'];
            $amount = (float) $data['amount'];
            $paymentMethods = $this->parsePaymentMethodsInput($request, $amount);
            $proofPath = $paymentStatus === 'paid' && $this->paymentMethodsRequireProof($paymentMethods) && $request->hasFile('proof_photo')
                ? $request->file('proof_photo')?->store('payment-proofs', 'public')
                : null;

            $tenantId = $this->defaultTenantId($request);
            $memberBranchId = $data['member_id'] ? $this->memberBranchId((int) $data['member_id']) : null;
            $branchId = $this->branchIdForWrite($request, $data['branch_id'] ?? $memberBranchId);
            $amountPaid = in_array($paymentStatus, ['paid', 'courtesy'], true) ? $amount : 0;

            $paymentRow = [
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'member_id' => $data['member_id'] ?? null,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $amount,
                'amount_paid' => $amountPaid,
                'status' => $paymentStatus,
                'paid_on' => Carbon::parse($data['paid_on'])->toDateString(),
                'due_on' => in_array($paymentStatus, ['credit', 'pending'], true) ? ($data['due_on'] ?? Carbon::parse($data['paid_on'])->addDays(7)->toDateString()) : null,
                'customer_name' => $data['payer_name'] ?? null,
                'proof_path' => $proofPath,
                'notes' => 'Ingreso externo: '.$data['concept'].($data['payer_name'] ? ' · '.$data['payer_name'] : '').' · '.$data['category'].($data['notes'] ? ' · '.$data['notes'] : ''),
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $this->applyPaymentMethodsToPaymentRow($paymentRow, $paymentMethods);
            DB::table('gym_payments')->insert($paymentRow);
        }

        $query = $this->scopeTenant(DB::table('gym_payments'), $request, 'gym_payments')
            ->leftJoin('gym_members', 'gym_members.id', '=', 'gym_payments.member_id')
            ->orderByDesc('gym_payments.id');

        if ($this->tableHasColumn('gym_payments', 'membership_id')) {
            $query->leftJoin('gym_memberships', 'gym_memberships.id', '=', 'gym_payments.membership_id')
                ->leftJoin('gym_plans as membership_plan', 'membership_plan.id', '=', 'gym_memberships.plan_id');
        }

        if ($this->tableHasColumn('gym_payments', 'branch_id')) {
            $query->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_payments.branch_id');
            $query->whereNotNull('gym_payments.branch_id');
            $this->scopeBranches($query, $request, 'gym_payments');
            if ($request->filled('branch_id')) {
                $query->where('gym_payments.branch_id', (int) $request->query('branch_id'));
            }
        }

        $select = ['gym_payments.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name")];
        if ($this->tableHasColumn('gym_payments', 'customer_name')) {
            $select[] = DB::raw("COALESCE(gym_payments.customer_name, CONCAT(gym_members.first_name, ' ', gym_members.last_name)) as payer_display");
        } else {
            $select[] = DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as payer_display");
        }
        if ($this->tableHasColumn('gym_payments', 'branch_id')) {
            $select[] = 'gym_branches.name as branch_name';
        }
        if ($this->tableHasColumn('gym_payments', 'membership_id')) {
            $select[] = 'gym_memberships.starts_on as membership_starts_on';
            $select[] = 'gym_memberships.ends_on as membership_ends_on';
            $select[] = 'membership_plan.name as membership_plan_name';
        }
        $query->select($select);

        if ($request->boolean('receivable_only')) {
            $query->whereIn('gym_payments.status', ['pending', 'credit', 'partial']);
        }

        return response()->json($query->limit(150)->get()->map(function ($payment) {
            return $this->enrichPayment($payment);
        }));
    }

    public function collectPayment(Request $request, int $payment): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['nullable', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin', 'mixed'])],
            'payment_methods' => ['nullable'],
            'paid_on' => ['required', 'date'],
            'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $paymentRow = $this->scopeTenant(DB::table('gym_payments')->where('id', $payment), $request, 'gym_payments')->first();
        abort_unless($paymentRow !== null, 404, 'Pago no encontrado.');
        abort_unless(in_array($paymentRow->status, ['pending', 'credit', 'partial'], true), 422, 'Este pago no está pendiente de cobro.');

        $balanceDue = round((float) $paymentRow->amount - (float) ($paymentRow->amount_paid ?? 0), 2);
        abort_unless($balanceDue > 0, 422, 'Este pago ya fue saldado.');
        abort_unless((float) $data['amount'] <= $balanceDue, 422, 'El monto a cobrar supera el saldo pendiente.');

        $collectionAmount = round((float) $data['amount'], 2);
        $paymentMethods = $this->parsePaymentMethodsInput($request, $collectionAmount);
        $proofPath = $this->paymentMethodsRequireProof($paymentMethods) && $request->hasFile('proof_photo')
            ? $request->file('proof_photo')?->store('payment-proofs', 'public')
            : null;

        $newAmountPaid = round((float) ($paymentRow->amount_paid ?? 0) + $collectionAmount, 2);
        $newStatus = $newAmountPaid >= (float) $paymentRow->amount ? 'paid' : 'partial';

        return DB::transaction(function () use ($request, $payment, $paymentRow, $data, $proofPath, $collectionAmount, $newAmountPaid, $newStatus, $paymentMethods): JsonResponse {
            $parentUpdate = [
                'amount_paid' => $newAmountPaid,
                'status' => $newStatus,
                'proof_path' => $proofPath ?? $paymentRow->proof_path,
                'paid_on' => Carbon::parse($data['paid_on'])->toDateString(),
                'notes' => trim(($paymentRow->notes ?? '').' · Cobro: S/ '.number_format($collectionAmount, 2).($data['notes'] ? ' · '.$data['notes'] : '')),
                'updated_at' => now(),
            ];
            $this->applyPaymentMethodsToPaymentRow($parentUpdate, $paymentMethods);
            DB::table('gym_payments')->where('id', $payment)->update($parentUpdate);

            $collectionRow = [
                'tenant_id' => $paymentRow->tenant_id,
                'branch_id' => $paymentRow->branch_id,
                'member_id' => $paymentRow->member_id,
                'parent_payment_id' => $payment,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $collectionAmount,
                'amount_paid' => $collectionAmount,
                'proof_path' => $proofPath,
                'status' => 'paid',
                'paid_on' => Carbon::parse($data['paid_on'])->toDateString(),
                'customer_name' => $paymentRow->customer_name,
                'notes' => 'Recuperación de deuda · Ref. '.$paymentRow->receipt_number.($data['notes'] ? ' · '.$data['notes'] : ''),
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $this->applyPaymentMethodsToPaymentRow($collectionRow, $paymentMethods);
            $collectionId = DB::table('gym_payments')->insertGetId($collectionRow);

            return response()->json([
                'payment_id' => $payment,
                'collection_id' => $collectionId,
                'status' => $newStatus,
                'amount_paid' => $newAmountPaid,
                'balance_due' => round(max(0, (float) $paymentRow->amount - $newAmountPaid), 2),
            ]);
        });
    }

    public function products(Request $request): JsonResponse
    {
        if (! Schema::hasTable('gym_products')) {
            return response()->json([]);
        }

        $query = $this->scopeTenant(DB::table('gym_products'), $request, 'gym_products')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_products.branch_id')
            ->select('gym_products.*', 'gym_branches.name as branch_name')
            ->orderBy('gym_products.name');
        $this->scopeBranches($query, $request, 'gym_products');

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search): void {
                $q->where('gym_products.name', 'like', "%{$search}%")
                    ->orWhere('gym_products.code', 'like', "%{$search}%")
                    ->orWhere('gym_products.description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('branch_id')) {
            $query->where('gym_products.branch_id', (int) $request->query('branch_id'));
        }

        return response()->json($query->get());
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        $tenantId = $this->defaultTenantId($request);
        abort_unless(! DB::table('gym_products')->where('tenant_id', $tenantId)->where('code', $data['code'])->exists(), 422, 'El código ya existe para este cliente.');

        $data['tenant_id'] = $tenantId;
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['stock'] = (float) $data['stock'];
        $data['unit_cost'] = (float) $data['unit_cost'];
        $data['unit_price'] = (float) $data['unit_price'];
        $data['min_stock'] = $data['min_stock'] !== null ? (float) $data['min_stock'] : null;
        $data['created_by'] = $request->user()?->id;
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $productId = DB::table('gym_products')->insertGetId($data);

        if ($data['stock'] > 0) {
            DB::table('gym_product_movements')->insert([
                'tenant_id' => $tenantId,
                'branch_id' => $data['branch_id'],
                'product_id' => $productId,
                'type' => 'initial',
                'quantity' => $data['stock'],
                'unit_cost' => $data['unit_cost'],
                'unit_price' => $data['unit_price'],
                'total_cost' => round($data['stock'] * $data['unit_cost'], 2),
                'total_price' => round($data['stock'] * $data['unit_price'], 2),
                'balance_quantity' => $data['stock'],
                'notes' => 'Stock inicial de producto',
                'created_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(DB::table('gym_products')->find($productId), 201);
    }

    public function updateProduct(Request $request, int $product): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
            'is_active' => ['required', 'boolean'],
        ]);

        $tenantId = $this->defaultTenantId($request);
        $productRow = DB::table('gym_products')->where('id', $product)->where('tenant_id', $tenantId)->first();
        abort_unless($productRow !== null, 422, 'El producto no pertenece al cliente activo.');
        abort_unless(! DB::table('gym_products')->where('tenant_id', $tenantId)->where('code', $data['code'])->where('id', '<>', $product)->exists(), 422, 'El código ya existe para este cliente.');

        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['stock'] = (float) $data['stock'];
        $data['unit_cost'] = (float) $data['unit_cost'];
        $data['unit_price'] = (float) $data['unit_price'];
        $data['min_stock'] = $data['min_stock'] !== null ? (float) $data['min_stock'] : null;
        $data['updated_at'] = now();

        DB::table('gym_products')->where('id', $product)->update($data);

        $stockDifference = $data['stock'] - (float) $productRow->stock;
        if ($stockDifference !== 0) {
            DB::table('gym_product_movements')->insert([
                'tenant_id' => $tenantId,
                'branch_id' => $data['branch_id'],
                'product_id' => $product,
                'type' => $stockDifference > 0 ? 'adjustment_in' : 'adjustment_out',
                'quantity' => abs($stockDifference),
                'unit_cost' => $data['unit_cost'],
                'unit_price' => $data['unit_price'],
                'total_cost' => round(abs($stockDifference) * $data['unit_cost'], 2),
                'total_price' => round(abs($stockDifference) * $data['unit_price'], 2),
                'balance_quantity' => $data['stock'],
                'notes' => 'Ajuste de stock al editar producto',
                'created_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(DB::table('gym_products')->find($product));
    }

    public function destroyProduct(Request $request, int $product): JsonResponse
    {
        $hasHistory = DB::table('gym_product_sales')->where('product_id', $product)->exists()
            || DB::table('gym_product_movements')->where('product_id', $product)->exists();

        if ($hasHistory) {
            $this->scopeTenant(DB::table('gym_products')->where('id', $product), $request, 'gym_products')->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);

            return response()->json([
                'ok' => true,
                'mode' => 'deactivated',
                'message' => 'El producto tiene movimientos; se desactivó para preservar histórico.',
            ]);
        }

        $this->scopeTenant(DB::table('gym_products')->where('id', $product), $request, 'gym_products')->delete();

        return response()->json(['ok' => true, 'mode' => 'deleted']);
    }

    public function productSales(Request $request): JsonResponse
    {
        if (! Schema::hasTable('gym_product_sales')) {
            return response()->json([]);
        }

        $query = $this->scopeTenant(DB::table('gym_product_sales'), $request, 'gym_product_sales')
            ->leftJoin('gym_products', 'gym_products.id', '=', 'gym_product_sales.product_id')
            ->leftJoin('gym_members', 'gym_members.id', '=', 'gym_product_sales.member_id')
            ->select(
                'gym_product_sales.*',
                'gym_products.name as product_name',
                'gym_products.code as product_code',
                DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name")
            )
            ->orderByDesc('gym_product_sales.id');

        $this->scopeBranches($query, $request, 'gym_product_sales');

        return response()->json($query->limit(100)->get());
    }

    public function sellProduct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:gym_products,id'],
            'member_id' => ['nullable', 'exists:gym_members,id'],
            'customer_name' => ['nullable', 'string', 'max:120'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin'])],
            'payment_status' => ['required', Rule::in(['paid', 'credit', 'courtesy'])],
            'sale_date' => ['required', 'date'],
            'due_on' => ['nullable', 'date'],
            'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'notes' => ['nullable', 'string'],
        ]);

        $data['member_id'] = filled($data['member_id'] ?? null) ? (int) $data['member_id'] : null;
        $data['customer_name'] = filled($data['customer_name'] ?? null) ? trim((string) $data['customer_name']) : null;
        $data['notes'] = filled($data['notes'] ?? null) ? trim((string) $data['notes']) : null;
        $data['due_on'] = filled($data['due_on'] ?? null) ? Carbon::parse($data['due_on'])->toDateString() : null;

        $tenantId = $this->defaultTenantId($request);
        $product = DB::table('gym_products')->where('id', $data['product_id'])->where('tenant_id', $tenantId)->first();
        abort_unless($product !== null, 422, 'El producto no pertenece al cliente activo.');

        if ($data['member_id'] !== null) {
            abort_unless(DB::table('gym_members')->where('id', $data['member_id'])->where('tenant_id', $tenantId)->exists(), 422, 'El socio no pertenece al cliente activo.');
        }

        $quantity = (float) $data['quantity'];
        abort_unless((float) $product->stock >= $quantity, 422, 'Stock insuficiente para realizar la venta.');

        $saleDate = Carbon::parse($data['sale_date'])->toDateString();
        $totalAmount = round($quantity * (float) $data['unit_price'], 2);
        $newStock = round((float) $product->stock - $quantity, 3);
        $paymentStatus = (string) $data['payment_status'];
        $amountPaid = in_array($paymentStatus, ['paid', 'courtesy'], true) ? $totalAmount : 0;
        $proofPath = $paymentStatus === 'paid' && $data['payment_method'] !== 'cash' && $request->hasFile('proof_photo')
            ? $request->file('proof_photo')?->store('payment-proofs', 'public')
            : null;
        $branchId = $product->branch_id ? (int) $product->branch_id : $this->branchIdForWrite($request, $data['member_id'] ? $this->memberBranchId((int) $data['member_id']) : null);

        return DB::transaction(function () use ($request, $data, $tenantId, $product, $quantity, $newStock, $totalAmount, $saleDate, $paymentStatus, $amountPaid, $proofPath, $branchId): JsonResponse {
            DB::table('gym_products')->where('id', $product->id)->update([ 'stock' => $newStock, 'updated_at' => now() ]);

            $saleId = DB::table('gym_product_sales')->insertGetId([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'product_id' => $product->id,
                'member_id' => $data['member_id'] ?? null,
                'customer_name' => $data['customer_name'] ?? null,
                'quantity' => $quantity,
                'unit_price' => (float) $data['unit_price'],
                'total_amount' => $totalAmount,
                'payment_method' => $data['payment_method'],
                'payment_status' => $paymentStatus,
                'sale_date' => $saleDate,
                'due_on' => $paymentStatus === 'credit' ? ($data['due_on'] ?? Carbon::parse($saleDate)->addDays(7)->toDateString()) : null,
                'notes' => $data['notes'],
                'created_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $paymentId = DB::table('gym_payments')->insertGetId([
                'tenant_id' => $tenantId,
                'branch_id' => $branchId,
                'member_id' => $data['member_id'] ?? null,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $totalAmount,
                'amount_paid' => $amountPaid,
                'method' => $data['payment_method'],
                'proof_path' => $proofPath,
                'status' => $paymentStatus,
                'paid_on' => $saleDate,
                'due_on' => $paymentStatus === 'credit' ? ($data['due_on'] ?? Carbon::parse($saleDate)->addDays(7)->toDateString()) : null,
                'customer_name' => $data['customer_name'],
                'notes' => 'Venta de producto: '.($product->name ?? 'Producto').($data['notes'] !== null ? ' · '.$data['notes'] : ''),
                'registered_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('gym_product_sales')->where('id', $saleId)->update(['payment_id' => $paymentId]);

            DB::table('gym_product_movements')->insert([
                'tenant_id' => $tenantId,
                'branch_id' => $product->branch_id,
                'product_id' => $product->id,
                'type' => 'sale',
                'reference_type' => 'product_sale',
                'reference_id' => $saleId,
                'quantity' => $quantity,
                'unit_cost' => (float) $product->unit_cost,
                'unit_price' => (float) $data['unit_price'],
                'total_cost' => round($quantity * (float) $product->unit_cost, 2),
                'total_price' => $totalAmount,
                'balance_quantity' => $newStock,
                'notes' => 'Venta de producto'.($data['notes'] !== null ? ': '.$data['notes'] : ''),
                'created_by' => $request->user()?->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['sale_id' => $saleId, 'payment_id' => $paymentId], 201);
        });
    }

    public function productMovements(Request $request): JsonResponse
    {
        $query = $this->scopeTenant(DB::table('gym_product_movements'), $request, 'gym_product_movements')
            ->leftJoin('gym_products', 'gym_products.id', '=', 'gym_product_movements.product_id')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_product_movements.branch_id')
            ->select('gym_product_movements.*', 'gym_products.name as product_name', 'gym_products.code as product_code', 'gym_branches.name as branch_name')
            ->orderByDesc('gym_product_movements.created_at');
        $this->scopeBranches($query, $request, 'gym_product_movements');

        if ($request->filled('product_id')) {
            $query->where('gym_product_movements.product_id', (int) $request->query('product_id'));
        }

        if ($request->filled('branch_id')) {
            $query->where('gym_product_movements.branch_id', (int) $request->query('branch_id'));
        }

        return response()->json($query->limit(200)->get()->map(function ($movement) {
            $movement->movement_type = $movement->type;
            $movement->concept = $movement->notes;

            return $movement;
        }));
    }

    public function purchaseProductStock(Request $request, int $product): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
            'purchased_on' => ['nullable', 'date'],
        ]);

        $tenantId = $this->defaultTenantId($request);
        $productRow = DB::table('gym_products')->where('id', $product)->where('tenant_id', $tenantId)->first();
        abort_unless($productRow !== null, 422, 'El producto no pertenece al cliente activo.');

        $quantity = (float) $data['quantity'];
        $unitCost = (float) $data['unit_cost'];
        $newStock = round((float) $productRow->stock + $quantity, 3);
        $branchId = $productRow->branch_id ? (int) $productRow->branch_id : $this->branchIdForWrite($request, null);

        DB::table('gym_products')->where('id', $product)->update([
            'stock' => $newStock,
            'unit_cost' => $unitCost,
            'updated_at' => now(),
        ]);

        DB::table('gym_product_movements')->insert([
            'tenant_id' => $tenantId,
            'branch_id' => $branchId,
            'product_id' => $product,
            'type' => 'purchase',
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'unit_price' => (float) $productRow->unit_price,
            'total_cost' => round($quantity * $unitCost, 2),
            'total_price' => round($quantity * (float) $productRow->unit_price, 2),
            'balance_quantity' => $newStock,
            'notes' => $data['notes'] ?? 'Compra de mercadería',
            'created_by' => $request->user()?->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'product_id' => $product,
            'stock' => $newStock,
            'message' => 'Ingreso de stock registrado correctamente.',
        ], 201);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'exists:gym_members,id'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
        ]);

        $this->assertMemberAccessible($request, (int) $data['member_id']);
        $tenantId = $this->defaultTenantId($request);
        $this->refreshExpiredMemberships($tenantId, (int) $data['member_id']);

        $membership = DB::table('gym_memberships')
            ->where('member_id', $data['member_id'])
            ->where('status', 'active')
            ->whereDate('starts_on', '<=', now()->toDateString())
            ->whereDate('ends_on', '>=', now()->toDateString())
            ->orderByDesc('ends_on')
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

    public function destroyAttendance(Request $request, int $attendance): JsonResponse
    {
        $row = $this->scopeTenant(DB::table('gym_attendances')->where('id', $attendance), $request, 'gym_attendances')->first();
        abort_unless($row !== null, 404, 'Registro de acceso no encontrado.');

        $this->assertMemberAccessible($request, (int) $row->member_id);
        DB::table('gym_attendances')->where('id', $attendance)->delete();

        return response()->json([
            'ok' => true,
            'message' => 'Acceso eliminado correctamente.',
        ]);
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
        $query = $this->scopeTenant(DB::table('gym_training_subscriptions'), $request, 'gym_training_subscriptions')
            ->join('gym_members', 'gym_members.id', '=', 'gym_training_subscriptions.member_id')
            ->leftJoin('gym_payments', 'gym_payments.training_subscription_id', '=', 'gym_training_subscriptions.id')
            ->select(
                'gym_training_subscriptions.*',
                DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"),
                'gym_members.dni',
                'gym_members.branch_id',
                'gym_payments.id as payment_id',
                'gym_payments.receipt_number as payment_receipt_number',
                'gym_payments.amount as payment_amount',
                'gym_payments.method as payment_method_recorded',
                'gym_payments.status as payment_status',
                'gym_payments.paid_on as payment_paid_on',
                'gym_payments.proof_path as payment_proof_path'
            )
            ->orderByDesc('gym_training_subscriptions.id');

        $this->scopeBranches($query, $request, 'gym_training_subscriptions', 'gym_members.branch_id');

        return response()->json($query->limit(100)->get()
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
                'branch_id' => $this->branchIdForWrite($request, $this->memberBranchId((int) $data['member_id'])),
                'member_id' => $data['member_id'],
                'training_subscription_id' => $id,
                'receipt_number' => $this->nextPaymentReceiptNumber(),
                'amount' => $data['monthly_fee'],
                'amount_paid' => $data['monthly_fee'],
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

        $query = $this->scopeTenant(DB::table('gym_class_bookings'), $request, 'gym_class_bookings')
            ->join('gym_members', 'gym_members.id', '=', 'gym_class_bookings.member_id')
            ->join('gym_classes', 'gym_classes.id', '=', 'gym_class_bookings.class_id')
            ->select('gym_class_bookings.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"), 'gym_members.dni')
            ->where('gym_class_bookings.class_id', $class)
            ->where('gym_class_bookings.booking_date', $date)
            ->orderByDesc('gym_class_bookings.id');

        $this->scopeBranches($query, $request, 'gym_class_bookings', 'gym_classes.branch_id');

        return response()->json($query->get());
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
        if (! $this->isSystemAdmin($request->user()) && ! in_array((int) $gymClass->branch_id, $this->userBranchIds($request), true)) {
            abort(403, 'No tienes acceso a esta clase.');
        }
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
            ['tenant_id' => $this->defaultTenantId($request), 'branch_id' => $gymClass->branch_id ? $this->branchIdForWrite($request, $gymClass->branch_id) : $this->branchIdForWrite($request, null), 'status' => 'reserved', 'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['ok' => true], 201);
    }

    public function checkInClassBooking(Request $request, int $booking): JsonResponse
    {
        $bookingRow = DB::table('gym_class_bookings')->where('id', $booking)->first();
        abort_unless($bookingRow, 404, 'Reserva no encontrada.');

        $gymClass = DB::table('gym_classes')->where('id', $bookingRow->class_id)->first();
        abort_unless($gymClass, 404, 'Clase no encontrada.');
        if (! $this->isSystemAdmin($request->user()) && ! in_array((int) $gymClass->branch_id, $this->userBranchIds($request), true)) {
            abort(403, 'No tienes acceso a esta clase.');
        }

        DB::table('gym_class_bookings')->where('id', $booking)->update([
            'status' => 'attended',
            'checked_in_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function cancelClassBooking(Request $request, int $booking): JsonResponse
    {
        $bookingRow = DB::table('gym_class_bookings')->where('id', $booking)->first();
        abort_unless($bookingRow, 404, 'Reserva no encontrada.');

        $gymClass = DB::table('gym_classes')->where('id', $bookingRow->class_id)->first();
        abort_unless($gymClass, 404, 'Clase no encontrada.');
        if (! $this->isSystemAdmin($request->user()) && ! in_array((int) $gymClass->branch_id, $this->userBranchIds($request), true)) {
            abort(403, 'No tienes acceso a esta clase.');
        }

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

    public function storeEquipment(Request $request): JsonResponse
    {
        $data = $this->validateEquipment($request);
        $data['tenant_id'] = $this->defaultTenantId($request);
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('gym_equipment')->insertGetId($data);

        return response()->json(DB::table('gym_equipment')->find($id), 201);
    }

    public function updateEquipment(Request $request, int $equipment): JsonResponse
    {
        $data = $this->validateEquipment($request, $equipment);
        $data['branch_id'] = $this->branchIdForWrite($request, $data['branch_id'] ?? null);
        $data['updated_at'] = now();

        $updated = $this->scopeTenant(DB::table('gym_equipment')->where('id', $equipment), $request, 'gym_equipment')->update($data);
        abort_unless($updated > 0, 404, 'Equipo no encontrado.');

        return response()->json(DB::table('gym_equipment')->find($equipment));
    }

    public function destroyEquipment(Request $request, int $equipment): JsonResponse
    {
        $deleted = $this->scopeTenant(DB::table('gym_equipment')->where('id', $equipment), $request, 'gym_equipment')->delete();
        abort_unless($deleted > 0, 404, 'Equipo no encontrado.');

        return response()->json(['ok' => true, 'message' => 'Equipo eliminado correctamente.']);
    }

    private function validateEquipment(Request $request, ?int $equipmentId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'code' => ['required', 'string', 'max:40', Rule::unique('gym_equipment', 'code')->ignore($equipmentId)],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
            'purchased_on' => ['nullable', 'date'],
            'next_maintenance_on' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['operational', 'maintenance', 'damaged'])],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
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
                'payment_method' => ['nullable', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin', 'mixed'])],
                'payment_methods' => ['nullable'],
                'proof_photo' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
                'description' => ['required', 'string', 'max:255'],
            ]);
            $data['tenant_id'] = $this->defaultTenantId($request);
            if ($this->tableHasColumn('gym_expenses', 'branch_id')) {
                $data['branch_id'] = $this->branchIdForWrite($request, null);
            }
            $amount = (float) $data['amount'];
            $paymentMethods = $this->parsePaymentMethodsInput($request, $amount, 'payment_method');
            $data['proof_path'] = $this->paymentMethodsRequireProof($paymentMethods) && $request->hasFile('proof_photo')
                ? $request->file('proof_photo')?->store('expense-proofs', 'public')
                : null;
            $data['registered_by'] = $request->user()?->id;
            $data['created_at'] = now();
            $data['updated_at'] = now();
            unset($data['payment_methods']);
            $this->applyPaymentMethodsToExpenseRow($data, $paymentMethods);
            DB::table('gym_expenses')->insert($data);
        }

        $query = $this->scopeTenant(DB::table('gym_expenses'), $request, 'gym_expenses')->orderByDesc('spent_on');

        if ($this->tableHasColumn('gym_expenses', 'branch_id')) {
            $query->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_expenses.branch_id')
                ->select('gym_expenses.*', 'gym_branches.name as branch_name');
            $query->whereNotNull('gym_expenses.branch_id');
            $this->scopeBranches($query, $request, 'gym_expenses');
            if ($request->filled('branch_id')) {
                $query->where('gym_expenses.branch_id', (int) $request->query('branch_id'));
            }
        } else {
            $query->select('gym_expenses.*');
        }

        return response()->json($query->limit(80)->get()->map(function ($expense) {
            $expense->proof_url = $expense->proof_path ? Storage::disk('public')->url($expense->proof_path) : null;
            $expense->payment_methods = $this->decodePaymentMethodsColumn($expense->payment_methods ?? null);

            return $expense;
        }));
    }

    public function notifications(Request $request): JsonResponse
    {
        return response()->json($this->scopeTenant(DB::table('gym_notifications'), $request, 'gym_notifications')->orderByRaw('read_at is not null')->latest()->limit(50)->get());
    }

    public function markNotificationsRead(Request $request): JsonResponse
    {
        $this->scopeTenant(DB::table('gym_notifications')->whereNull('read_at'), $request, 'gym_notifications')->update([
            'read_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
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
            'branches' => DB::table('gym_branches')->orderBy('name')->get(),
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

    public function updateTenantUser(Request $request, int $user): JsonResponse
    {
        $this->requireSystemAdmin($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:120', Rule::unique('users', 'email')->ignore($user)],
            'password' => ['nullable', 'string', 'min:8'],
            'tenant_id' => ['nullable', 'exists:gym_tenants,id'],
            'branch_id' => ['nullable', 'exists:gym_branches,id'],
            'role_id' => ['nullable', 'exists:roles,id'],
            'is_superadmin' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        User::query()->where('id', $user)->update($data);
        DB::table('gym_branch_user')->where('user_id', $user)->delete();
        if (!empty($data['branch_id'])) {
            DB::table('gym_branch_user')->insert(['user_id' => $user, 'branch_id' => $data['branch_id']]);
        }

        return response()->json(User::query()->findOrFail($user));
    }

    public function updateBranch(Request $request, int $branch): JsonResponse
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
        $data['updated_at'] = now();
        DB::table('gym_branches')->where('id', $branch)->update($data);

        return response()->json(DB::table('gym_branches')->find($branch));
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

    private function memberBranchId(int $memberId): ?int
    {
        $branchId = DB::table('gym_members')->where('id', $memberId)->value('branch_id');

        return $branchId ? (int) $branchId : null;
    }

    private function enrichPayment(object $payment): object
    {
        $amount = (float) $payment->amount;
        $amountPaid = $this->tableHasColumn('gym_payments', 'amount_paid')
            ? (float) ($payment->amount_paid ?? 0)
            : (in_array($payment->status ?? '', ['paid', 'courtesy'], true) ? $amount : 0);
        $payment->amount_paid = $amountPaid;
        $payment->balance_due = round(max(0, $amount - $amountPaid), 2);
        $payment->proof_url = $payment->proof_path ? Storage::disk('public')->url($payment->proof_path) : null;
        $payment->payer_name = $payment->customer_name ?? ($payment->payer_display ?? $payment->member_name ?? null);
        $payment->payment_methods = $this->decodePaymentMethodsColumn($payment->payment_methods ?? null);

        return $payment;
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

