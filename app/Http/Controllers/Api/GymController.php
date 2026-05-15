<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GymController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();
        $monthEnd = $today->copy()->endOfMonth();

        $income = (float) DB::table('gym_payments')
            ->where('status', 'paid')
            ->whereBetween('paid_on', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $expenses = (float) DB::table('gym_expenses')
            ->whereBetween('spent_on', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->sum('amount');

        $expiring = DB::table('gym_memberships')
            ->where('status', 'active')
            ->whereBetween('ends_on', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->count();

        return response()->json([
            'kpis' => [
                ['label' => 'Socios activos', 'value' => DB::table('gym_members')->where('status', 'active')->count(), 'hint' => 'Clientes con estado activo'],
                ['label' => 'Ingresos del mes', 'value' => 'S/ '.number_format($income, 2), 'hint' => 'Pagos confirmados'],
                ['label' => 'Utilidad estimada', 'value' => 'S/ '.number_format($income - $expenses, 2), 'hint' => 'Ingresos menos gastos'],
                ['label' => 'Por vencer', 'value' => $expiring, 'hint' => 'Membresías próximos 7 días'],
            ],
            'attendance_today' => DB::table('gym_attendances')->whereDate('checked_in_at', $today->toDateString())->count(),
            'plan_mix' => DB::table('gym_memberships')
                ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
                ->select('gym_plans.name', DB::raw('count(*) as total'))
                ->where('gym_memberships.status', 'active')
                ->groupBy('gym_plans.name')
                ->get(),
            'notifications' => DB::table('gym_notifications')->whereNull('read_at')->latest()->limit(6)->get(),
        ]);
    }

    public function members(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = DB::table('gym_members')
            ->leftJoin('gym_branches', 'gym_branches.id', '=', 'gym_members.branch_id')
            ->select('gym_members.*', 'gym_branches.name as branch_name')
            ->orderByDesc('gym_members.id');

        if ($search !== '') {
            $query->where(function ($q) use ($search): void {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
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
            'document_number' => ['required', 'string', 'max:30', Rule::unique('gym_members', 'document_number')],
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
            'document_number' => ['required', 'string', 'max:30', Rule::unique('gym_members', 'document_number')->ignore($member)],
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
        $data['updated_at'] = now();

        DB::table('gym_members')->where('id', $member)->update($data);

        return response()->json(DB::table('gym_members')->find($member));
    }

    public function plans(): JsonResponse
    {
        return response()->json(DB::table('gym_plans')->orderBy('price')->get());
    }

    public function storePlan(Request $request): JsonResponse
    {
        $data = $this->validatePlan($request);
        $data['created_at'] = now();
        $data['updated_at'] = now();

        $id = DB::table('gym_plans')->insertGetId($data);

        return response()->json(DB::table('gym_plans')->find($id), 201);
    }

    public function updatePlan(Request $request, int $plan): JsonResponse
    {
        $data = $this->validatePlan($request, $plan);
        $data['updated_at'] = now();

        DB::table('gym_plans')->where('id', $plan)->update($data);

        return response()->json(DB::table('gym_plans')->find($plan));
    }

    public function destroyPlan(int $plan): JsonResponse
    {
        $hasMemberships = DB::table('gym_memberships')->where('plan_id', $plan)->exists();

        if ($hasMemberships) {
            DB::table('gym_plans')->where('id', $plan)->update([
                'is_active' => false,
                'updated_at' => now(),
            ]);

            return response()->json([
                'ok' => true,
                'mode' => 'deactivated',
                'message' => 'El plan tiene membresías asociadas; se desactivó para conservar histórico.',
            ]);
        }

        DB::table('gym_plans')->where('id', $plan)->delete();

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

    public function branches(): JsonResponse
    {
        return response()->json(DB::table('gym_branches')->where('is_active', true)->orderBy('name')->get());
    }

    public function sellMembership(Request $request): JsonResponse
    {
        $data = $request->validate([
            'member_id' => ['required', 'exists:gym_members,id'],
            'plan_id' => ['required', 'exists:gym_plans,id'],
            'starts_on' => ['required', 'date'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'method' => ['required', Rule::in(['cash', 'card', 'transfer', 'yape', 'plin'])],
            'notes' => ['nullable', 'string'],
        ]);

        $plan = DB::table('gym_plans')->where('id', $data['plan_id'])->first();
        $starts = Carbon::parse($data['starts_on']);
        $discount = (float) ($data['discount'] ?? 0);
        $amount = max(0, (float) $plan->price - $discount);

        return DB::transaction(function () use ($request, $data, $plan, $starts, $discount, $amount): JsonResponse {
            DB::table('gym_memberships')->where('member_id', $data['member_id'])->where('status', 'active')->update(['status' => 'replaced', 'updated_at' => now()]);
            $membershipId = DB::table('gym_memberships')->insertGetId([
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
                'member_id' => $data['member_id'],
                'membership_id' => $membershipId,
                'receipt_number' => 'B001-'.str_pad((string) (((int) DB::table('gym_payments')->max('id')) + 1), 5, '0', STR_PAD_LEFT),
                'amount' => $amount,
                'method' => $data['method'],
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

    public function memberships(): JsonResponse
    {
        return response()->json(DB::table('gym_memberships')
            ->join('gym_members', 'gym_members.id', '=', 'gym_memberships.member_id')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->select('gym_memberships.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"), 'gym_plans.name as plan_name')
            ->orderByDesc('gym_memberships.id')
            ->limit(100)
            ->get());
    }

    public function payments(): JsonResponse
    {
        return response()->json(DB::table('gym_payments')
            ->join('gym_members', 'gym_members.id', '=', 'gym_payments.member_id')
            ->select('gym_payments.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"))
            ->orderByDesc('gym_payments.id')
            ->limit(100)
            ->get());
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
            'member_id' => $data['member_id'],
            'branch_id' => $data['branch_id'] ?? DB::table('gym_members')->where('id', $data['member_id'])->value('branch_id'),
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

    public function attendance(): JsonResponse
    {
        return response()->json(DB::table('gym_attendances')
            ->join('gym_members', 'gym_members.id', '=', 'gym_attendances.member_id')
            ->select('gym_attendances.*', DB::raw("CONCAT(gym_members.first_name, ' ', gym_members.last_name) as member_name"))
            ->orderByDesc('checked_in_at')
            ->limit(80)
            ->get());
    }

    public function classes(): JsonResponse
    {
        return response()->json(DB::table('gym_classes')
            ->leftJoin('users', 'users.id', '=', 'gym_classes.trainer_id')
            ->select('gym_classes.*', 'users.name as trainer_name')
            ->orderBy('weekday')
            ->orderBy('starts_at')
            ->get());
    }

    public function equipment(): JsonResponse
    {
        return response()->json(DB::table('gym_equipment')->orderBy('next_maintenance_on')->get());
    }

    public function expenses(Request $request): JsonResponse
    {
        if ($request->isMethod('post')) {
            $data = $request->validate([
                'category' => ['required', 'string', 'max:80'],
                'supplier' => ['nullable', 'string', 'max:120'],
                'amount' => ['required', 'numeric', 'min:0.01'],
                'spent_on' => ['required', 'date'],
                'payment_method' => ['required', 'string', 'max:40'],
                'description' => ['nullable', 'string'],
            ]);
            $data['registered_by'] = $request->user()?->id;
            $data['created_at'] = now();
            $data['updated_at'] = now();
            DB::table('gym_expenses')->insert($data);
        }

        return response()->json(DB::table('gym_expenses')->orderByDesc('spent_on')->limit(80)->get());
    }

    public function notifications(): JsonResponse
    {
        return response()->json(DB::table('gym_notifications')->orderByRaw('read_at is not null')->latest()->limit(50)->get());
    }
}
