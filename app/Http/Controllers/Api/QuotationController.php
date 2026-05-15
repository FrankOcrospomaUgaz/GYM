<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Project;
use App\Models\Quotation;
use App\Models\QuotationLine;
use App\Support\AreaVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Quotation::query()->with(['client:id,legal_name', 'areas:id,name']);
        AreaVisibility::applyQuotationScope($q, $request->user());

        if ($request->filled('status')) {
            $q->where('status', $request->input('status'));
        }

        return response()->json($q->orderByDesc('id')->paginate(25));
    }

    public function show(Request $request, Quotation $quotation): JsonResponse
    {
        $this->assertQuotation($request, $quotation);

        return response()->json($quotation->load(['client', 'areas', 'lines', 'currency']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'status' => ['nullable', 'string', 'max:32'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'currency_id' => ['nullable', 'integer', 'exists:currencies,id'],
            'valid_until' => ['nullable', 'date'],
            'opportunity_id' => ['nullable', 'integer', 'exists:opportunities,id'],
            'notes' => ['nullable', 'string'],
            'area_ids' => ['required', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $this->assertClientVisible($request, (int) $data['client_id']);

        $quotation = DB::transaction(function () use ($request, $data) {
            $lines = $data['lines'];
            $areaIds = $data['area_ids'];
            unset($data['lines'], $data['area_ids']);

            $data['tax_amount'] = $data['tax_amount'] ?? 0;
            $data['discount'] = $data['discount'] ?? 0;
            $data['created_by'] = $request->user()?->id;
            $data['number'] = 'TMP';
            $data['status'] = $data['status'] ?? 'draft';
            $data['subtotal'] = 0;
            $data['total'] = 0;

            $qRow = Quotation::query()->create($data);

            self::persistLinesAndTotals($qRow, $lines);

            $qRow->areas()->sync($areaIds);

            $qRow->number = 'COT-'.date('Y').'-'.str_pad((string) $qRow->id, 6, '0', STR_PAD_LEFT);
            $qRow->save();

            return $qRow->fresh(['lines', 'areas']);
        });

        return response()->json($quotation, 201);
    }

    public function update(Request $request, Quotation $quotation): JsonResponse
    {
        $this->assertQuotation($request, $quotation);
        $data = $request->validate([
            'status' => ['sometimes', 'string', 'max:32'],
            'tax_amount' => ['sometimes', 'numeric', 'min:0'],
            'discount' => ['sometimes', 'numeric', 'min:0'],
            'currency_id' => ['nullable', 'integer', 'exists:currencies,id'],
            'valid_until' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'area_ids' => ['sometimes', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'lines' => ['sometimes', 'array', 'min:1'],
            'lines.*.description' => ['required', 'string'],
            'lines.*.quantity' => ['required', 'numeric', 'min:0'],
            'lines.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($quotation, $data) {
            $linesData = $data['lines'] ?? null;
            unset($data['lines']);
            $areaIds = $data['area_ids'] ?? null;
            unset($data['area_ids']);
            foreach (['tax_amount', 'discount', 'currency_id', 'valid_until', 'status', 'notes'] as $key) {
                if (array_key_exists($key, $data)) {
                    $quotation->{$key} = $data[$key];
                }
            }
            $quotation->save();
            if (is_array($linesData)) {
                self::persistLinesAndTotals($quotation, $linesData);
            }
            if (is_array($areaIds)) {
                $quotation->areas()->sync($areaIds);
            }
        });

        return response()->json($quotation->fresh()->load(['lines', 'areas', 'client']));
    }

    public function accept(Request $request, Quotation $quotation): JsonResponse
    {
        $this->assertQuotation($request, $quotation);
        $data = $request->validate([
            'project_name' => ['nullable', 'string', 'max:255'],
            'service_type' => ['nullable', 'string', 'max:255'],
            'area_ids' => ['sometimes', 'array', 'min:1'],
            'area_ids.*' => ['integer', 'exists:areas,id'],
            'lead_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $project = DB::transaction(function () use ($quotation, $request, $data) {
            $quotation->update([
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            $name = $data['project_name'] ?? ('Proyecto — '.$quotation->number);

            $p = Project::query()->create([
                'client_id' => $quotation->client_id,
                'name' => $name,
                'service_type' => $data['service_type'] ?? null,
                'status' => 'pending',
                'budget' => $quotation->total,
                'lead_user_id' => $data['lead_user_id'] ?? $request->user()?->id,
                'description' => $quotation->notes,
            ]);

            $areaIds = $data['area_ids'] ?? $quotation->areas()->pluck('areas.id')->all();
            $p->areas()->sync($areaIds);

            $quotation->update(['accepted_project_id' => $p->id]);

            return $p->load(['areas']);
        });

        return response()->json([
            'quotation' => $quotation->fresh()->load(['lines', 'areas']),
            'project' => $project,
        ]);
    }

    public function destroy(Request $request, Quotation $quotation): JsonResponse
    {
        $this->assertQuotation($request, $quotation);
        $quotation->update(['status' => 'rejected']);

        return response()->json(null, 204);
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private static function persistLinesAndTotals(Quotation $quotation, array $lines): void
    {
        QuotationLine::query()->where('quotation_id', $quotation->id)->delete();
        $subtotal = 0.0;

        foreach ($lines as $l) {
            $qty = (float) $l['quantity'];
            $price = (float) $l['unit_price'];
            $lineTotal = round($qty * $price, 2);
            $subtotal += $lineTotal;

            QuotationLine::query()->create([
                'quotation_id' => $quotation->id,
                'description' => $l['description'],
                'quantity' => $qty,
                'unit_price' => $price,
                'line_total' => $lineTotal,
            ]);
        }

        $tax = (float) ($quotation->tax_amount ?? 0);
        $disc = (float) ($quotation->discount ?? 0);
        $total = round($subtotal + $tax - $disc, 2);

        $quotation->update([
            'subtotal' => round($subtotal, 2),
            'total' => max(0, $total),
        ]);
    }

    private function assertQuotation(Request $request, Quotation $quotation): void
    {
        $q = Quotation::query()->whereKey($quotation->id);
        AreaVisibility::applyQuotationScope($q, $request->user());
        if (! $q->exists()) {
            abort(404);
        }
    }

    private function assertClientVisible(Request $request, int $clientId): void
    {
        $q = Client::query()->whereKey($clientId);
        AreaVisibility::applyClientScope($q, $request->user());
        if (! $q->exists()) {
            abort(422, 'Cliente fuera del alcance de su usuario.');
        }
    }
}
