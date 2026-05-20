export type PaymentMethodLine = {
  method: string;
  amount: string;
};

export const PAYMENT_METHOD_CODES = ["cash", "card", "transfer", "yape", "plin"] as const;

export function defaultPaymentMethods(totalAmount = ""): PaymentMethodLine[] {
  return [{ method: "cash", amount: totalAmount }];
}

export function normalizePaymentMethodLines(lines: PaymentMethodLine[], expectedTotal?: number) {
  const cleaned = lines
    .map((line) => ({
      method: String(line.method || "cash"),
      amount: Math.round(Number(line.amount || 0) * 100) / 100,
    }))
    .filter((line) => line.amount > 0);

  if (cleaned.length === 0) {
    throw new Error("Agregue al menos un medio de pago con monto.");
  }

  if (expectedTotal !== undefined) {
    const total = Math.round(cleaned.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
    const expected = Math.round(expectedTotal * 100) / 100;
    if (total !== expected) {
      throw new Error(`La suma de medios (S/ ${total.toFixed(2)}) debe coincidir con el total (S/ ${expected.toFixed(2)}).`);
    }
  }

  return cleaned;
}

export function primaryPaymentMethod(lines: { method: string }[]) {
  if (lines.length === 0) return "cash";
  if (lines.length === 1) return lines[0].method;
  return "mixed";
}

export function parsePaymentMethods(raw: unknown): PaymentMethodLine[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((line) => ({
      method: String((line as PaymentMethodLine).method ?? "cash"),
      amount: String((line as PaymentMethodLine).amount ?? ""),
    }));
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as PaymentMethodLine[];
      return Array.isArray(parsed) ? parsePaymentMethods(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function appendPaymentMethodsToFormData(formData: FormData, lines: PaymentMethodLine[], expectedTotal?: number) {
  const normalized = normalizePaymentMethodLines(lines, expectedTotal);
  formData.append("payment_methods", JSON.stringify(normalized));
  formData.append("method", primaryPaymentMethod(normalized));
  formData.append("payment_method", primaryPaymentMethod(normalized));
}

export function paymentMethodsLabel(method: unknown, paymentMethods: unknown, translate: (code: string) => string) {
  const lines = parsePaymentMethods(paymentMethods);
  if (lines.length > 1) {
    return lines.map((line) => `${translate(line.method)} S/ ${Number(line.amount).toFixed(2)}`).join(" · ");
  }
  if (lines.length === 1) return translate(lines[0].method);
  if (method === "mixed") return "Varios medios";
  return translate(String(method ?? "cash"));
}
