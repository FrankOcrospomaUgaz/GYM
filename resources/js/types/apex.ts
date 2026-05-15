export type OrderStatusSlice = { name: string; value: number; color: string };

export type KpiRow = {
  id: string;
  title: string;
  value: string;
  delta: string;
  up: boolean;
};

export type ApexPayload = {
  kpi: KpiRow[];
  orderStatus: OrderStatusSlice[];
  orderTotal: number;
  ordersMenuBadge: number;
};

export function readApexPayload(): ApexPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as unknown as { __APEX__?: ApexPayload };
  return w.__APEX__ ?? null;
}
