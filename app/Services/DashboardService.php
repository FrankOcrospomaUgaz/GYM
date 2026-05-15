<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function payload(?User $user): array
    {
        if ($user === null || ! DB::getSchemaBuilder()->hasTable('gym_members')) {
            return ['kpi' => [], 'orderStatus' => [], 'orderTotal' => 0, 'ordersMenuBadge' => 0];
        }

        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth()->toDateString();
        $monthEnd = $today->copy()->endOfMonth()->toDateString();

        $income = (float) DB::table('gym_payments')->where('status', 'paid')->whereBetween('paid_on', [$monthStart, $monthEnd])->sum('amount');
        $expenses = (float) DB::table('gym_expenses')->whereBetween('spent_on', [$monthStart, $monthEnd])->sum('amount');
        $activeMembers = (int) DB::table('gym_members')->where('status', 'active')->count();
        $attendanceToday = (int) DB::table('gym_attendances')->whereDate('checked_in_at', $today->toDateString())->count();
        $expiring = (int) DB::table('gym_memberships')
            ->where('status', 'active')
            ->whereBetween('ends_on', [$today->toDateString(), $today->copy()->addDays(7)->toDateString()])
            ->count();

        $planMix = DB::table('gym_memberships')
            ->join('gym_plans', 'gym_plans.id', '=', 'gym_memberships.plan_id')
            ->where('gym_memberships.status', 'active')
            ->select('gym_plans.name', DB::raw('COUNT(*) as c'))
            ->groupBy('gym_plans.name')
            ->pluck('c', 'name');

        $totalPlans = max(1, (int) $planMix->sum());
        $colors = ['#ffcc00', '#111827', '#f59e0b', '#22c55e'];
        $orderStatus = [];
        foreach ($planMix as $name => $count) {
            $orderStatus[] = [
                'name' => $name,
                'value' => (int) round(((int) $count / $totalPlans) * 100),
                'color' => $colors[count($orderStatus) % count($colors)],
            ];
        }

        return [
            'kpi' => [
                ['id' => 'members', 'title' => 'Socios activos', 'value' => (string) $activeMembers, 'delta' => 'Base vigente', 'up' => true],
                ['id' => 'income', 'title' => 'Ingresos del mes', 'value' => 'S/ '.number_format($income, 2), 'delta' => 'Pagos confirmados', 'up' => true],
                ['id' => 'profit', 'title' => 'Utilidad estimada', 'value' => 'S/ '.number_format($income - $expenses, 2), 'delta' => 'Ingresos - gastos', 'up' => $income >= $expenses],
                ['id' => 'attendance', 'title' => 'Ingresos hoy', 'value' => (string) $attendanceToday, 'delta' => 'Control de acceso', 'up' => true],
            ],
            'orderStatus' => $orderStatus,
            'orderTotal' => $totalPlans,
            'ordersMenuBadge' => $expiring,
            'meta' => ['expiring_memberships' => $expiring, 'monthly_expenses' => $expenses],
        ];
    }
}
