import type { SearchableSelectOption } from "./SearchableSelect";

type AnyRow = Record<string, unknown>;

export const membershipStatusFilterOptions: SearchableSelectOption[] = [
  { value: "", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "expired", label: "Vencido" },
  { value: "pending", label: "Pendiente" },
  { value: "cancelled", label: "Cancelado" },
  { value: "replaced", label: "Reemplazado" },
];

export const memberStatusFilterOptions: SearchableSelectOption[] = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "blocked", label: "Bloqueado" },
];

export const memberRecordStatusOptions: SearchableSelectOption[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "blocked", label: "Bloqueado" },
];

export const pageSizeOptions: SearchableSelectOption[] = [
  { value: "10", label: "10" },
  { value: "25", label: "25" },
  { value: "50", label: "50" },
];

export const pageSizeOptionsLarge: SearchableSelectOption[] = [
  ...pageSizeOptions,
  { value: "100", label: "100" },
];

export const paymentStatusOptions: SearchableSelectOption[] = [
  { value: "paid", label: "Pagado" },
  { value: "credit", label: "Crédito" },
  { value: "pending", label: "Pendiente" },
  { value: "courtesy", label: "Cortesía" },
];

export const productPaymentStatusOptions: SearchableSelectOption[] = [
  { value: "paid", label: "Pagado" },
  { value: "credit", label: "Crédito" },
  { value: "courtesy", label: "Cortesía" },
];

export const paymentMethodOptions: SearchableSelectOption[] = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "transfer", label: "Transferencia" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
];

export const equipmentStatusOptions: SearchableSelectOption[] = [
  { value: "operational", label: "Operativo" },
  { value: "maintenance", label: "En mantenimiento" },
  { value: "damaged", label: "Averiado" },
];

export const trainingStatusFilterOptions: SearchableSelectOption[] = [
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Inactivas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "expired", label: "Vencidas" },
  { value: "all", label: "Todas" },
];

export const tenantBillingStatusOptions: SearchableSelectOption[] = [
  { value: "active", label: "Activo" },
  { value: "trial", label: "Prueba" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
];

export const classLevelOptions: SearchableSelectOption[] = [
  { value: "Todos", label: "Todos" },
  { value: "Principiante", label: "Principiante" },
  { value: "Intermedio", label: "Intermedio" },
  { value: "Avanzado", label: "Avanzado" },
  { value: "Competidor", label: "Competidor" },
];

export const weekdayOptions: SearchableSelectOption[] = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
].map((day) => ({ value: day, label: day }));

export function stringOptions(values: string[]): SearchableSelectOption[] {
  return values.map((value) => ({ value, label: value }));
}

export function branchOptions(branches: AnyRow[]): SearchableSelectOption[] {
  return branches.map((branch) => ({
    value: String(branch.id),
    label: String(branch.name ?? branch.id),
  }));
}

export function defaultBranchId(user: AnyRow | null | undefined, branches: AnyRow[]): string {
  if (user?.branch_id) return String(user.branch_id);
  if (branches.length === 1) return String(branches[0].id);
  return branches[0]?.id ? String(branches[0].id) : "";
}

export function memberBranchSelectOptions(user: AnyRow | null | undefined, branches: AnyRow[]): SearchableSelectOption[] {
  const options = branchOptions(branches);
  const preferredId = defaultBranchId(user, branches);
  if (preferredId && !options.some((item) => item.value === preferredId)) {
    return [{ value: preferredId, label: String(user?.branch_name ?? `Sede ${preferredId}`) }, ...options];
  }
  return options;
}

export function isMemberBranchLocked(user: AnyRow | null | undefined, branches: AnyRow[], editing: boolean): boolean {
  if (editing) return false;
  if (user?.is_superadmin && !user?.branch_id) return false;
  if (user?.branch_id) return true;
  return branches.length === 1;
}

export function tenantOptions(tenants: AnyRow[]): SearchableSelectOption[] {
  return tenants.map((tenant) => ({
    value: String(tenant.id),
    label: String(tenant.name ?? tenant.id),
  }));
}

export function memberOptions(members: AnyRow[], short = false): SearchableSelectOption[] {
  return members.map((member) => ({
    value: String(member.id),
    label: short
      ? `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()
      : `${member.member_code ?? member.id} · ${member.first_name ?? ""} ${member.last_name ?? ""}`.trim(),
  }));
}

export function planOptions(plans: AnyRow[], money: (value: unknown) => string): SearchableSelectOption[] {
  return plans
    .filter((plan) => plan.is_active)
    .map((plan) => ({
      value: String(plan.id),
      label: `${plan.name} · ${money(plan.price)}`,
    }));
}

export function productOptions(products: AnyRow[], money: (value: unknown) => string): SearchableSelectOption[] {
  return products.map((product) => ({
    value: String(product.id),
    label: `${product.name} · ${money(product.unit_price)}`,
  }));
}

export function fitnessGoalOptions(goals: AnyRow[]): SearchableSelectOption[] {
  return goals.map((goal) => ({
    value: String(goal.name),
    label: String(goal.name),
  }));
}

export function categoryOptions(categories: string[]): SearchableSelectOption[] {
  return categories.map((category) => ({ value: category, label: category }));
}
