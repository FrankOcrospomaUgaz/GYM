<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Income;
use App\Models\Project;
use App\Models\TimeEntry;
use App\Models\User;
use App\Support\AreaVisibility;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends Controller
{
    public function cashFlow(Request $request): JsonResponse
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'granularity' => ['nullable', 'string', 'in:month,week,day'],
        ]);

        $from = $request->input('from') ? Carbon::parse($request->string('from')) : Carbon::now()->startOfYear();
        $to = $request->input('to') ? Carbon::parse($request->string('to')) : Carbon::now()->endOfMonth();

        $incomes = Income::query()
            ->selectRaw('DATE_FORMAT(recorded_on, \'%Y-%m\') as period, SUM(amount) as total')
            ->whereBetween('recorded_on', [$from->toDateString(), $to->toDateString()])
            ->groupBy('period');
        AreaVisibility::applyIncomeScope($incomes, $request->user());

        $expenses = Expense::query()
            ->selectRaw('DATE_FORMAT(recorded_on, \'%Y-%m\') as period, SUM(amount) as total')
            ->whereBetween('recorded_on', [$from->toDateString(), $to->toDateString()])
            ->groupBy('period');
        AreaVisibility::applyExpenseScope($expenses, $request->user());

        $rangeStart = $from->toDateString();
        $rangeEnd = $to->toDateString();

        $incomeTotalRow = Income::query()->whereBetween('recorded_on', [$rangeStart, $rangeEnd]);
        AreaVisibility::applyIncomeScope($incomeTotalRow, $request->user());

        $expenseTotalRow = Expense::query()->whereBetween('recorded_on', [$rangeStart, $rangeEnd]);
        AreaVisibility::applyExpenseScope($expenseTotalRow, $request->user());

        return response()->json([
            'ingresos' => $incomes->get(),
            'gastos' => $expenses->get(),
            'totales' => [
                'ingresos' => (float) $incomeTotalRow->sum('amount'),
                'gastos' => (float) $expenseTotalRow->sum('amount'),
                'balance' => round((float) $incomeTotalRow->sum('amount') - (float) $expenseTotalRow->sum('amount'), 2),
            ],
        ]);
    }

    public function profitabilityProjects(Request $request): JsonResponse
    {
        $q = Project::query()->with([
            'client:id,legal_name',
            'areas:id,name',
            'leadUser:id,name',
            'users:id,name,cost_per_hour',
        ]);

        AreaVisibility::applyProjectScope($q, $request->user());
        $rows = $q->orderByDesc('id')->limit(400)->get();

        $payload = [];
        foreach ($rows as $p) {
            $incomes = Income::query()->where('project_id', $p->id);
            AreaVisibility::applyIncomeScope($incomes, $request->user());

            $expensesMoney = Expense::query()->where('project_id', $p->id);
            AreaVisibility::applyExpenseScope($expensesMoney, $request->user());

            $timeRows = TimeEntry::query()->where('project_id', $p->id)->with('user:id,cost_per_hour,name');
            AreaVisibility::applyTimeEntryScope($timeRows, $request->user());

            $incomeSum = (float) $incomes->sum('amount');
            $expenseSum = (float) $expensesMoney->sum('amount');

            $laborCost = 0.0;
            foreach ($timeRows->clone()->get() as $te) {
                $rate = (float) ($te->user->cost_per_hour ?? 0);
                $laborCost += ((float) $te->hours) * $rate;
            }

            $totalCost = $expenseSum + $laborCost;
            $util = $incomeSum - $totalCost;
            $marginPct = $incomeSum > 0 ? round($util / $incomeSum * 100, 2) : 0.0;

            $payload[] = [
                'project_id' => $p->id,
                'name' => $p->name,
                'client' => $p->client->legal_name ?? '',
                'ingresos' => $incomeSum,
                'gastos_directos' => $expenseSum,
                'costo_horas_estimado' => round($laborCost, 2),
                'utilidad_neta_estimada' => round($util, 2),
                'margen_pct' => $marginPct,
            ];
        }

        usort($payload, fn ($a, $b) => $b['utilidad_neta_estimada'] <=> $a['utilidad_neta_estimada']);

        return response()->json([
            'data' => array_slice($payload, 0, 100),
            'formula' => 'Utilidad estimada = Ingresos del proyecto − (Gastos directos + Horas registradas × costo/hora)',
        ]);
    }

    public function profitabilityClients(Request $request): JsonResponse
    {
        $q = Client::query();
        AreaVisibility::applyClientScope($q, $request->user());
        $clients = $q->with('areas')->orderByDesc('id')->limit(300)->get();

        $payload = [];

        foreach ($clients as $c) {
            $projectIds = $c->projects()->pluck('id');

            $incomeSum = Income::query()->where(function ($w) use ($c, $projectIds) {
                $w->where('client_id', $c->id)->orWhereIn('project_id', $projectIds);
            });
            AreaVisibility::applyIncomeScope($incomeSum, $request->user());
            $iVal = (float) $incomeSum->sum('amount');

            $expenseSum = Expense::query()->where('client_id', $c->id);
            AreaVisibility::applyExpenseScope($expenseSum, $request->user());
            $eVal = (float) $expenseSum->sum('amount');

            $util = $iVal - $eVal;

            $payload[] = [
                'client_id' => $c->id,
                'legal_name' => $c->legal_name,
                'ingresos' => $iVal,
                'gastos_declarados' => $eVal,
                'utilidad' => round($util, 2),
                'areas' => $c->areas->pluck('name')->values()->all(),
            ];
        }

        usort($payload, fn ($a, $b) => $b['utilidad'] <=> $a['utilidad']);

        return response()->json([
            'data' => array_slice($payload, 0, 100),
            'formula' => 'Rentabilidad = Ingresos asociados al cliente − Gastos registrados contra el cliente',
        ]);
    }

    public function profitabilityAreas(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user === null) {
            abort(401);
        }

        $aidList = AreaVisibility::canSeeAll($user)
            ? Area::query()->where('is_active', true)->orderBy('name')->pluck('id')
            : collect(AreaVisibility::userAreaIds($user));

        $data = [];

        foreach ($aidList as $aid) {
            $incomes = Income::query()->where('area_id', $aid);
            AreaVisibility::applyIncomeScope($incomes, $user);
            $iVal = (float) $incomes->sum('amount');

            $expenses = Expense::query()->where('area_id', $aid);
            AreaVisibility::applyExpenseScope($expenses, $user);
            $eVal = (float) $expenses->sum('amount');

            $areaRow = Area::query()->find($aid);

            $data[] = [
                'area_id' => $aid,
                'area_name' => $areaRow ? $areaRow->name : '',
                'ingresos' => $iVal,
                'gastos' => $eVal,
                'utilidad' => round($iVal - $eVal, 2),
            ];
        }

        usort($data, fn ($a, $b) => $b['utilidad'] <=> $a['utilidad']);

        return response()->json(['data' => $data]);
    }

    public function consultantWorkload(Request $request): JsonResponse
    {
        $q = TimeEntry::query()
            ->selectRaw('user_id, SUM(hours) as total_hours')
            ->groupBy('user_id');
        AreaVisibility::applyTimeEntryScope($q, $request->user());
        $rows = $q->orderByDesc('total_hours')->get();

        $users = User::query()
            ->whereIn('id', $rows->pluck('user_id')->filter()->all())
            ->get()
            ->keyBy('id');

        $payload = $rows->map(function ($r) use ($users) {
            $u = $users->get($r->user_id);

            return [
                'user_id' => $r->user_id,
                'nombre' => $u?->name,
                'total_horas' => (float) $r->total_hours,
            ];
        });

        return response()->json([
            'data' => $payload->values()->all(),
        ]);
    }

    /** Top clientes con más ingresos (mes actual). */
    public function insights(Request $request): JsonResponse
    {
        $from = Carbon::now()->startOfMonth()->toDateString();
        $to = Carbon::now()->endOfMonth()->toDateString();

        $incomeClient = Income::query()
            ->selectRaw('client_id, SUM(amount) as t')
            ->whereBetween('recorded_on', [$from, $to])
            ->whereNotNull('client_id')
            ->groupBy('client_id');

        AreaVisibility::applyIncomeScope($incomeClient, $request->user());

        $topRows = $incomeClient->clone()->orderByDesc('t')->limit(10)->get();

        $payload = [];
        foreach ($topRows as $row) {
            $c = Client::query()->find($row->client_id);

            $payload[] = [
                'client_id' => $row->client_id,
                'legal_name' => $c?->legal_name,
                'total' => (float) $row->t,
            ];
        }

        $quotationsPending = \App\Models\Quotation::query()
            ->whereIn('status', ['draft', 'sent'])
            ->tap(fn ($qr) => AreaVisibility::applyQuotationScope($qr, $request->user()))
            ->count();

        return response()->json([
            'period' => [$from, $to],
            'top_clients' => $payload,
            'cotizaciones_pendientes' => $quotationsPending,
        ]);
    }
}
