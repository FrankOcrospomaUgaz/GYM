import { Plus, Trash2 } from "lucide-react";
import { paymentMethodOptions } from "./gymSelectOptions";
import { SearchableSelect } from "./SearchableSelect";
import type { PaymentMethodLine } from "../lib/paymentMethods";
import { PAYMENT_METHOD_CODES } from "../lib/paymentMethods";

function fieldClass(extra = "") {
  return `rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-[#ffcc00] focus:ring-2 focus:ring-[#ffcc00]/30 ${extra}`;
}

type Props = {
  lines: PaymentMethodLine[];
  totalAmount?: number | string;
  file: File | null;
  existingProofUrl?: string;
  onChange: (lines: PaymentMethodLine[]) => void;
  onFileChange: (file: File | null) => void;
};

export function PaymentMethodsFields({ lines, totalAmount, file, existingProofUrl, onChange, onFileChange }: Props) {
  const showProofUpload = lines.some((line) => line.method !== "cash" && Number(line.amount) > 0);
  const assigned = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  const target = Number(totalAmount ?? 0);
  const remaining = Math.round((target - assigned) * 100) / 100;

  function updateLine(index: number, patch: Partial<PaymentMethodLine>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    const nextMethod = PAYMENT_METHOD_CODES.find((code) => !lines.some((line) => line.method === code)) ?? "cash";
    onChange([...lines, { method: nextMethod, amount: remaining > 0 ? String(remaining) : "" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== index));
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Medios de pago</p>
        <button type="button" onClick={addLine} className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-950 ring-1 ring-zinc-200">
          <Plus className="h-3.5 w-3.5" /> Agregar medio
        </button>
      </div>
      {target > 0 ? (
        <p className="text-xs font-semibold text-zinc-600">
          Total: S/ {target.toFixed(2)} · Asignado: S/ {assigned.toFixed(2)}
          {remaining !== 0 ? <span className={remaining > 0 ? " text-amber-700" : " text-red-700"}> · Pendiente: S/ {remaining.toFixed(2)}</span> : <span className=" text-emerald-700"> · Cuadra</span>}
        </p>
      ) : null}
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <SearchableSelect required value={line.method || "cash"} onChange={(value) => updateLine(index, { method: value })} options={paymentMethodOptions} className={fieldClass("w-full")} />
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={line.amount}
              onChange={(event) => updateLine(index, { amount: event.target.value })}
              placeholder="Monto"
              className={fieldClass("w-full")}
            />
            <button type="button" disabled={lines.length <= 1} onClick={() => removeLine(index)} className="grid h-[46px] w-[46px] place-items-center rounded-xl bg-red-50 text-red-700 ring-1 ring-red-100 disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {showProofUpload ? (
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Foto del comprobante (opcional)
          <input type="file" accept="image/*" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} className={fieldClass("w-full file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white")} />
          {file ? <span className="text-xs font-semibold normal-case tracking-normal text-zinc-500">{file.name}</span> : null}
          {!file && existingProofUrl ? <a href={existingProofUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit rounded-xl bg-blue-50 px-3 py-2 text-xs font-black normal-case tracking-normal text-blue-700">Ver comprobante actual</a> : null}
        </label>
      ) : null}
    </div>
  );
}


