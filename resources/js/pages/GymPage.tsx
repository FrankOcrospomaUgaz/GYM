import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle, BadgeCheck, Banknote, Bell, CalendarDays, Dumbbell, Edit3, Eye, IdCard, LayoutDashboard, LogOut, Menu, MessageCircle, PackageCheck, Plus, QrCode, Search, ShieldCheck, Trash2, Trophy, Users, X } from "lucide-react";
import { httpClient } from "../http/client";
import { parseApiError, registerHttpErrorHandlers } from "../http/api-errors";
import { SearchableSelect } from "../components/SearchableSelect";
import {
  branchOptions,
  categoryOptions,
  equipmentStatusOptions,
  fitnessGoalOptions,
  memberOptions,
  memberRecordStatusOptions,
  memberStatusFilterOptions,
  pageSizeOptions,
  pageSizeOptionsLarge,
  paymentMethodOptions,
  paymentStatusOptions,
  planOptions,
  productOptions,
  productPaymentStatusOptions,
  stringOptions,
  tenantBillingStatusOptions,
  tenantOptions,
  trainingStatusFilterOptions,
  classLevelOptions,
  weekdayOptions,
} from "../components/gymSelectOptions";
import { useAuth } from "../context/AuthContext";

type AnyRow = Record<string, any>;
type Tab = "dashboard" | "members" | "plans" | "memberships" | "attendance" | "classes" | "finance" | "products" | "equipment" | "system";
type ConfirmState = { title: string; body: string; onConfirm: () => Promise<void> } | null;
type ErrorState = { title: string; message: string; details?: string[]; sessionExpired?: boolean } | null;
type MemberModalContext = "general" | "training";
type ClassViewMode = "mes" | "semana" | "tabla";

const classDisciplines = ["MMA", "Sparring", "Box", "Brazilian Jiu-Jitsu", "Muay Thai", "Funcional", "Cardio", "Fuerza", "Yoga"];
const expenseCategories = ["Alquiler", "Servicios", "Sueldos", "Limpieza", "Mantenimiento", "Equipos", "Marketing", "Internet", "Impuestos", "Software", "Insumos", "Seguridad", "Otros"];
const incomeCategories = ["Venta externa", "Alquiler de ambiente", "Venta de productos", "Patrocinio", "Evento", "Clase particular", "Recuperación de deuda", "Otros"];
const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Panel", icon: LayoutDashboard },
  { id: "members", label: "Socios", icon: Users },
  { id: "plans", label: "Planes", icon: IdCard },
  { id: "memberships", label: "Membresías", icon: BadgeCheck },
  { id: "attendance", label: "Accesos", icon: QrCode },
  { id: "classes", label: "Clases", icon: CalendarDays },
  { id: "finance", label: "Caja", icon: Banknote },
  { id: "products", label: "Productos", icon: PackageCheck },
  { id: "equipment", label: "Equipos", icon: PackageCheck },
  { id: "system", label: "Sistema SaaS", icon: ShieldCheck },
];

const emptyMember = {
  first_name: "",
  last_name: "",
  document_type: "DNI",
  dni: "",
  document_number: "",
  email: "",
  phone: "",
  birthdate: "",
  gender: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  medical_notes: "",
  fitness_goal: "",
  status: "active",
  branch_id: "",
};

const emptyPlan = {
  name: "",
  code: "",
  price: "",
  duration_days: "30",
  grace_days: "3",
  daily_access_limit: "",
  includes_classes: true,
  includes_trainer: false,
  description: "",
  is_active: true,
};

const emptyEquipment = {
  name: "",
  code: "",
  branch_id: "",
  purchased_on: "",
  next_maintenance_on: "",
  status: "operational",
  notes: "",
};

const emptyProduct = {
  code: "",
  name: "",
  description: "",
  unit_cost: "0",
  unit_price: "0",
  stock: "0",
  min_stock: "0",
  branch_id: "",
  is_active: true,
};

const emptyProductSale = {
  product_id: "",
  member_id: "",
  customer_name: "",
  quantity: "1",
  unit_price: "0",
  payment_method: "cash",
  payment_status: "paid",
  sale_date: new Date().toISOString().slice(0, 10),
  due_on: "",
  proof_photo: null as File | null,
  notes: "",
};

const emptyStockPurchase = {
  quantity: "1",
  unit_cost: "0",
  purchased_on: new Date().toISOString().slice(0, 10),
  notes: "",
};

const emptyCollectPayment = {
  payment_id: "",
  amount: "",
  method: "cash",
  paid_on: new Date().toISOString().slice(0, 10),
  proof_photo: null as File | null,
  notes: "",
};

const emptyClassForm = {
  name: "",
  category: "MMA",
  level: "Todos",
  branch_id: "",
  room: "",
  trainer_id: "",
  weekday: "Lunes",
  starts_at: "19:00",
  ends_at: "20:00",
  capacity: "20",
  color: "#ffcc00",
  description: "",
  is_active: true,
};

const emptyTrainingSubscriptionForm = {
  member_id: "",
  discipline: "MMA",
  monthly_fee: "180",
  starts_on: new Date().toISOString().slice(0, 10),
  selected_days: [] as string[],
  day_schedules: {} as Record<string, { start: string; end: string }>,
  preferred_time: "19:00",
  sessions_per_week: "3",
  payment_method: "cash",
  proof_photo: null,
  notes: "",
};

const labels: Record<string, string> = {
  member_code: "Código",
  dni: "DNI",
  first_name: "Nombres",
  last_name: "Apellidos",
  document_number: "Documento",
  phone: "Teléfono",
  status: "Estado",
  branch_name: "Sede",
  code: "Código",
  name: "Nombre",
  description: "Descripción",
  unit_cost: "Costo",
  unit_price: "Precio venta",
  stock: "Stock",
  min_stock: "Stock mínimo",
  product_code: "Código",
  customer_name: "Cliente",
  payer_name: "Cliente / pagador",
  due_on: "Vence",
  sale_date: "Fecha",
  price: "Precio",
  duration_days: "Duración",
  grace_days: "Gracia",
  daily_access_limit: "Accesos/día",
  includes_classes: "Clases",
  includes_trainer: "Entrenador",
  is_active: "Activo",
  member_name: "Socio",
  plan_name: "Plan",
  starts_on: "Inicio",
  ends_on: "Vence",
  discount: "Descuento",
  receipt_number: "Comprobante",
  amount: "Monto",
  method: "Medio",
  movement_type: "Tipo",
  concept: "Concepto",
  paid_on: "Fecha",
  movement_date: "Fecha",
  proof_url: "Foto",
  discipline: "Disciplina",
  monthly_fee: "Mensualidad",
  selected_days: "Días",
  day_schedules: "Horarios",
  preferred_time: "Hora",
  payment_method: "Pago",
  payment_status: "Estado pago",
  balance_due: "Saldo",
  amount_paid: "Cobrado",
  type: "Tipo",
  total_amount: "Total",
  product_name: "Producto",
  checked_in_at: "Entrada",
  checked_out_at: "Salida",
  result: "Resultado",
  notes: "Notas",
  category: "Categoría",
  weekday: "Día",
  starts_at: "Inicia",
  ends_at: "Termina",
  capacity: "Cupos",
  trainer_name: "Entrenador",
  next_maintenance_on: "Próximo mantenimiento",
  room: "Ambiente",
  level: "Nivel",
  color: "Color",
  email: "Correo",
  tenant_name: "Cliente",
  role_name: "Perfil",
  is_superadmin: "Admin sistema",
};

function money(value: unknown) {
  return `S/ ${Number(value ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

function cardClass() {
  return "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5";
}

function fieldClass(extra = "") {
  return `min-h-11 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-[#ffcc00] transition focus:border-[#ffcc00] focus:ring-4 focus:ring-[#ffcc00]/20 ${extra}`;
}

const cellTranslations: Record<string, Record<string, string>> = {
  method: {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    yape: "Yape",
    plin: "Plin",
  },
  payment_method: {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    yape: "Yape",
    plin: "Plin",
  },
  movement_type: {
    income: "Ingreso",
    expense: "Gasto",
    initial: "Stock inicial",
    purchase: "Compra",
    sale: "Venta",
    adjustment_in: "Ajuste entrada",
    adjustment_out: "Ajuste salida",
  },
  payment_status: {
    paid: "Pagado",
    credit: "Crédito",
    courtesy: "Cortesía",
  },
  status: {
    active: "Activo",
    inactive: "Inactivo",
    blocked: "Bloqueado",
    paid: "Pagado",
    pending: "Pendiente",
    credit: "Crédito",
    courtesy: "Cortesía",
    overdue: "Vencido",
    partial: "Parcial",
    annulled: "Anulado",
    reserved: "Reservado",
    attended: "Asistió",
    cancelled: "Cancelado",
    replaced: "Reemplazado",
    expired: "Vencido",
    operational: "Operativo",
    maintenance: "En mantenimiento",
    damaged: "Averiado",
    trial: "Prueba",
    paused: "Pausado",
  },
  result: {
    allowed: "Acceso autorizado",
    blocked: "Acceso denegado",
    denied: "Acceso denegado",
  },
};

function formatCell(column: string, value: unknown) {
  if (column === "proof_url") return value ? <a className="font-bold text-blue-700 underline" href={String(value)} target="_blank" rel="noreferrer">Ver foto</a> : "-";
  if (["checked_in_at", "checked_out_at", "paid_on", "starts_on", "ends_on", "next_maintenance_on"].includes(column)) return formatDateTime(value);
  if (column === "movement_date") return formatDateTime(value);
  if (column.includes("amount") || column === "price" || column === "discount") return money(value);
  if (column === "duration_days") return `${value ?? 0} días`;
  if (column === "grace_days") return `${value ?? 0} días`;
  if (column === "monthly_fee") return money(value);
  if (column === "selected_days" && Array.isArray(value)) return value.join(", ");
  if (column === "day_schedules" && value && typeof value === "object") return Object.entries(value as Record<string, { start?: string; end?: string }>).map(([day, range]) => `${day}: ${range.start ?? "--:--"}-${range.end ?? "--:--"}`).join(", ");
  if (typeof value === "boolean" || value === 0 || value === 1) return Boolean(value) ? "Sí" : "No";
  if (column === "type" || column === "payment_status") {
    const map = column === "type" ? cellTranslations.movement_type : cellTranslations.payment_status;
    if (map?.[String(value)]) return map[String(value)];
  }
  if (cellTranslations[column]?.[String(value)]) return column === "status" ? <StatusBadge value={String(value)} /> : cellTranslations[column][String(value)];
  return String(value ?? "-");
}

function StatusBadge({ value }: { value: string }) {
  const label = cellTranslations.status[value] ?? value;
  const classes = value === "active" || value === "paid" || value === "attended" || value === "operational"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : value === "cancelled" || value === "blocked" || value === "damaged"
      ? "bg-red-50 text-red-700 ring-red-200"
      : value === "pending" || value === "maintenance" || value === "trial"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-zinc-100 text-zinc-700 ring-zinc-200";

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${classes}`}>{label}</span>;
}

function formatDateTime(value: unknown) {
  if (!value) return "-";
  const text = String(value);
  const date = new Date(text.includes("T") ? text : text.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return text;
  const hasTime = /\d{2}:\d{2}/.test(text);
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

async function normalizeProofPhoto(file: File) {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "") || "comprobante";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

async function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return;
  if (key === "proof_photo" && value instanceof File) {
    formData.append(key, await normalizeProofPhoto(value));
    return;
  }
  formData.append(key, value as string | Blob);
}

function nextDateForWeekday(weekday: string) {
  const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const target = weekdays.indexOf(weekday);
  const today = new Date();
  const diff = target >= 0 ? (target - today.getDay() + 7) % 7 : 0;
  const date = new Date(today);
  date.setDate(today.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function buildMonthDays(baseDate: Date) {
  const weekdays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const todayIso = new Date().toISOString().slice(0, 10);
  const days = [];
  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(first.getFullYear(), first.getMonth(), day);
    const iso = date.toISOString().slice(0, 10);
    days.push({
      iso,
      day,
      weekday: weekdays[date.getDay()],
      weekdayShort: weekdays[date.getDay()].slice(0, 3),
      isToday: iso === todayIso,
    });
  }
  return days;
}

function subscriptionScheduleItems(subscriptions: AnyRow[]) {
  return subscriptions
    .filter((subscription) => subscription.status === "active")
    .flatMap((subscription) => {
      const schedules = subscription.day_schedules ?? {};
      const days: string[] = subscription.selected_days ?? [];
      return days.map((day) => {
        const range = schedules[day] ?? { start: subscription.preferred_time ?? "07:00", end: subscription.preferred_time ?? "08:00" };
        return {
          id: `${subscription.id}-${day}`,
          subscription_id: subscription.id,
          member_name: subscription.member_name,
          discipline: subscription.discipline,
          weekday: day,
          starts_at: range.start,
          ends_at: range.end,
          name: `${subscription.member_name} · ${subscription.discipline}`,
          category: subscription.discipline,
          level: "Mensualidad",
          room: "Horario del socio",
          trainer_name: "Mensual",
          color: "#ffcc00",
          source: subscription,
        };
      });
    });
}

const weeklyStartHour = 7;
const weeklyEndHour = 22;
const weeklyHourHeight = 76;

function timeToMinutes(value: unknown) {
  const [hour = 0, minute = 0] = String(value ?? "00:00").slice(0, 5).split(":").map((part) => Number(part));
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function weeklyClassStyle(gymClass: AnyRow, index: number) {
  const minMinute = weeklyStartHour * 60;
  const maxMinute = weeklyEndHour * 60;
  const starts = Math.max(minMinute, Math.min(maxMinute, timeToMinutes(gymClass.starts_at)));
  const ends = Math.max(starts + 30, Math.min(maxMinute, timeToMinutes(gymClass.ends_at)));
  const top = ((starts - minMinute) / 60) * weeklyHourHeight;
  const height = Math.max(58, ((ends - starts) / 60) * weeklyHourHeight);
  const overlapOffset = (index % 2) * 10;

  return {
    top,
    height,
    left: 8 + overlapOffset,
    right: 8,
    borderColor: gymClass.color ?? "#ffcc00",
  };
}

function defaultBranchId(user: AnyRow | null | undefined, branches: AnyRow[]) {
  if (user?.branch_id) return String(user.branch_id);
  return branches[0]?.id ? String(branches[0].id) : "";
}

function hasAssignedBranch(row: AnyRow) {
  return row.branch_id != null && String(row.branch_id) !== "";
}

function buildCashMovements(payments: AnyRow[], expenses: AnyRow[]) {
  return [
    ...payments.filter(hasAssignedBranch).map((payment) => ({
      id: `payment-${payment.id}`,
      payment_id: payment.id,
      movement_type: "income",
      concept: payment.notes?.startsWith("Ingreso externo")
        ? payment.notes.replace("Ingreso externo: ", "").split(" · ")[0]
        : (payment.notes ?? payment.receipt_number ?? "Pago recibido"),
      member_name: payment.payer_name ?? payment.member_name ?? payment.customer_name ?? "-",
      amount: Number(payment.amount ?? 0),
      balance_due: Number(payment.balance_due ?? 0),
      method: payment.method,
      movement_date: payment.paid_on ?? payment.due_on,
      proof_url: payment.proof_url,
      status: payment.status,
      branch_name: payment.branch_name,
      branch_id: payment.branch_id,
    })),
    ...expenses.filter(hasAssignedBranch).map((expense) => ({
      id: `expense-${expense.id}`,
      movement_type: "expense",
      concept: expense.description || expense.category,
      member_name: expense.supplier || "-",
      amount: -Number(expense.amount ?? 0),
      method: expense.payment_method,
      movement_date: expense.spent_on,
      proof_url: expense.proof_url,
      status: "paid",
      branch_name: expense.branch_name,
      branch_id: expense.branch_id,
    })),
  ].sort((a, b) => String(b.movement_date ?? "").localeCompare(String(a.movement_date ?? "")));
}

function dateOnly(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value).includes("T") ? String(value) : `${String(value)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysUntil(value: unknown) {
  const date = dateOnly(value);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function memberFullName(member: AnyRow) {
  return [member.first_name, member.last_name].filter(Boolean).join(" ").trim() || member.member_name || "Socio";
}

function whatsappUrl(phone: unknown, message: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const normalized = digits.length === 9 ? `51${digits}` : digits;
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : "";
}

function memberActiveMembership(member: AnyRow, memberships: AnyRow[]) {
  return memberships
    .filter((membership) => Number(membership.member_id) === Number(member.id) && membership.status === "active")
    .sort((a, b) => String(b.ends_on).localeCompare(String(a.ends_on)))[0] ?? null;
}

function lastAttendanceForMember(member: AnyRow, attendance: AnyRow[]) {
  return attendance
    .filter((item) => Number(item.member_id) === Number(member.id))
    .sort((a, b) => String(b.checked_in_at).localeCompare(String(a.checked_in_at)))[0] ?? null;
}

export function GymPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<AnyRow>({});
  const [members, setMembers] = useState<AnyRow[]>([]);
  const [plans, setPlans] = useState<AnyRow[]>([]);
  const [branches, setBranches] = useState<AnyRow[]>([]);
  const [fitnessGoals, setFitnessGoals] = useState<AnyRow[]>([]);
  const [memberMemberships, setMemberMemberships] = useState<AnyRow[]>([]);
  const [credentialMember, setCredentialMember] = useState<AnyRow | null>(null);
  const [memberships, setMemberships] = useState<AnyRow[]>([]);
  const [payments, setPayments] = useState<AnyRow[]>([]);
  const [expenses, setExpenses] = useState<AnyRow[]>([]);
  const [attendance, setAttendance] = useState<AnyRow[]>([]);
  const [classes, setClasses] = useState<AnyRow[]>([]);
  const [trainingSubscriptions, setTrainingSubscriptions] = useState<AnyRow[]>([]);
  const [equipment, setEquipment] = useState<AnyRow[]>([]);
  const [products, setProducts] = useState<AnyRow[]>([]);
  const [productSales, setProductSales] = useState<AnyRow[]>([]);
  const [productMovements, setProductMovements] = useState<AnyRow[]>([]);
  const [productBranchFilter, setProductBranchFilter] = useState("");
  const [financeBranchFilter, setFinanceBranchFilter] = useState("");
  const [notifications, setNotifications] = useState<AnyRow[]>([]);
  const [saas, setSaas] = useState<AnyRow>({ tenants: [], users: [], modules: [], roles: [], branches: [] });
  const [memberForm, setMemberForm] = useState<AnyRow>(emptyMember);
  const [planForm, setPlanForm] = useState<AnyRow>(emptyPlan);
  const [equipmentForm, setEquipmentForm] = useState<AnyRow>(emptyEquipment);
  const [productForm, setProductForm] = useState<AnyRow>(emptyProduct);
  const [productSaleForm, setProductSaleForm] = useState<AnyRow>(emptyProductSale);
  const [saleForm, setSaleForm] = useState<AnyRow>({ member_id: "", plan_id: "", starts_on: new Date().toISOString().slice(0, 10), discount: "0", method: "cash", status: "paid", due_on: "", proof_photo: null, notes: "" });
  const [incomeForm, setIncomeForm] = useState<AnyRow>({ category: "Venta externa", concept: "", payer_name: "", branch_id: "", amount: "", paid_on: new Date().toISOString().slice(0, 10), due_on: "", method: "cash", status: "paid", proof_photo: null, notes: "" });
  const [stockPurchaseForm, setStockPurchaseForm] = useState<AnyRow>(emptyStockPurchase);
  const [collectPaymentForm, setCollectPaymentForm] = useState<AnyRow>(emptyCollectPayment);
  const [selectedReceivable, setSelectedReceivable] = useState<AnyRow | null>(null);
  const [expenseForm, setExpenseForm] = useState<AnyRow>({ category: "Servicios", description: "", supplier: "", amount: "", spent_on: new Date().toISOString().slice(0, 10), payment_method: "cash", proof_photo: null });
  const [classForm, setClassForm] = useState<AnyRow>(emptyClassForm);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [memberStatusFilter, setMemberStatusFilter] = useState<string>("");
  const [memberBranchFilter, setMemberBranchFilter] = useState<string>("");
  const [membersPage, setMembersPage] = useState(1);
  const [membersPerPage, setMembersPerPage] = useState(25);
  const [memberTotal, setMemberTotal] = useState(0);
  const [classesViewMode, setClassesViewMode] = useState<ClassViewMode>("mes");
  const [classDetailOpen, setClassDetailOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<AnyRow | null>(null);
  const [classBookings, setClassBookings] = useState<AnyRow[]>([]);
  const [classBookingDate, setClassBookingDate] = useState(new Date().toISOString().slice(0, 10));
  const [classBookingMemberId, setClassBookingMemberId] = useState("");
  const [trainingSubscriptionForm, setTrainingSubscriptionForm] = useState<AnyRow>(emptyTrainingSubscriptionForm);
  const [trainingSubscriptionModalOpen, setTrainingSubscriptionModalOpen] = useState(false);
  const [trainingSubscriptionDetail, setTrainingSubscriptionDetail] = useState<AnyRow | null>(null);
  const [editingTrainingSubscriptionId, setEditingTrainingSubscriptionId] = useState<number | null>(null);
  const [trainingSubscriptionSaving, setTrainingSubscriptionSaving] = useState(false);
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState<number | null>(null);
  const [memberModalContext, setMemberModalContext] = useState<MemberModalContext>("general");
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSaleModalOpen, setProductSaleModalOpen] = useState(false);
  const [productKardexModalOpen, setProductKardexModalOpen] = useState(false);
  const [stockPurchaseModalOpen, setStockPurchaseModalOpen] = useState(false);
  const [collectPaymentModalOpen, setCollectPaymentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AnyRow | null>(null);
  const [memberMembershipModalOpen, setMemberMembershipModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AnyRow | null>(null);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [errorModal, setErrorModal] = useState<ErrorState>(null);
  const sessionRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silentRequest = { skipGlobalErrorHandler: true };
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  const activeMembers = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  const cashMovements = useMemo(() => buildCashMovements(payments, expenses), [payments, expenses]);
  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read_at), [notifications]);
  void classes;
  const visibleTabs = useMemo(() => {
    if (user?.is_superadmin) return tabs;
    const enabled = new Set<string>(dashboard.enabled_modules ?? tabs.filter((item) => item.id !== "system").map((item) => item.id));
    return tabs.filter((item) => item.id !== "system" && enabled.has(item.id));
  }, [dashboard.enabled_modules, user?.is_superadmin]);
  const headerBranchName = useMemo(() => {
    if (user?.branch_name) return user.branch_name;
    if (user?.branch_id) {
      const branch = branches.find((item) => String(item.id) === String(user.branch_id));
      if (branch?.name) return String(branch.name);
    }
    if (branches.length === 1) return String(branches[0].name);
    return user?.is_superadmin || !user?.branch_id ? "Todas las sedes" : "Mi sede";
  }, [branches, user?.branch_id, user?.branch_name, user?.is_superadmin]);
  const currentTab = visibleTabs.find((item) => item.id === tab) ?? visibleTabs[0] ?? tabs[0];

  useEffect(() => {
    registerHttpErrorHandlers({
      onSessionExpired: () => {
        setErrorModal({
          title: "Sesión expirada",
          message: "Tu sesión ya no es válida. Serás redirigido al inicio de sesión en unos segundos, o puedes ir ahora.",
          sessionExpired: true,
        });
        if (sessionRedirectRef.current) clearTimeout(sessionRedirectRef.current);
        sessionRedirectRef.current = setTimeout(() => {
          window.__AUTH__ = null;
          window.location.replace("/login");
        }, 4000);
      },
      onApiError: (error, title) => {
        const parsed = parseApiError(error, title);
        setErrorModal({ title: parsed.title, message: parsed.message, details: parsed.details });
      },
    });
    return () => {
      registerHttpErrorHandlers(null);
      if (sessionRedirectRef.current) clearTimeout(sessionRedirectRef.current);
    };
  }, []);

  function goToLogin() {
    if (sessionRedirectRef.current) clearTimeout(sessionRedirectRef.current);
    window.__AUTH__ = null;
    window.location.replace("/login");
  }

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setMobileMenuOpen(false);
  }

  async function loadAll() {
    const results = await Promise.allSettled([
      httpClient.get("/api/gym/dashboard", silentRequest),
      httpClient.get("/api/gym/branches", silentRequest),
      httpClient.get("/api/gym/fitness-goals", silentRequest),
      httpClient.get("/api/gym/plans", silentRequest),
      httpClient.get("/api/gym/members", { ...silentRequest, params: { search: memberSearch, status: memberStatusFilter, branch_id: memberBranchFilter, page: membersPage, per_page: membersPerPage } }),
      httpClient.get("/api/gym/memberships", silentRequest),
      httpClient.get("/api/gym/payments", { ...silentRequest, params: { branch_id: financeBranchFilter || undefined } }),
      httpClient.get("/api/gym/expenses", { ...silentRequest, params: { branch_id: financeBranchFilter || undefined } }),
      httpClient.get("/api/gym/attendance", silentRequest),
      httpClient.get("/api/gym/classes", silentRequest),
      httpClient.get("/api/gym/training-subscriptions", silentRequest),
      httpClient.get("/api/gym/equipment", silentRequest),
      httpClient.get("/api/gym/products", { ...silentRequest, params: { branch_id: productBranchFilter || undefined } }),
      httpClient.get("/api/gym/product-sales", { ...silentRequest, params: { branch_id: productBranchFilter || undefined } }),
      httpClient.get("/api/gym/notifications", silentRequest),
    ]);

    const data = <T,>(index: number, fallback: T): T => {
      const result = results[index];
      return result.status === "fulfilled" ? result.value.data : fallback;
    };

    setDashboard(data(0, {}));
    setBranches(data(1, []));
    setFitnessGoals(data(2, []));
    setPlans(data(3, []));
    const memberPayload = data(4, { rows: [], total: 0 }) as AnyRow;
    const memberRows = Array.isArray(memberPayload) ? memberPayload : (memberPayload.rows ?? []);
    setMembers(memberRows);
    setMemberTotal(memberPayload.total ?? memberRows.length);
    setMemberships(data(5, []));
    setPayments(data(6, []));
    setExpenses(data(7, []));
    setAttendance(data(8, []));
    setClasses(data(9, []));
    setTrainingSubscriptions(data(10, []));
    setEquipment(data(11, []));
    setProducts(data(12, []));
    setProductSales(data(13, []));
    setNotifications(data(14, []));

    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length) {
      console.error("Algunos módulos no cargaron:", failed);
    }

    if (user?.is_superadmin) {
      try {
        const saasRes = await httpClient.get("/api/gym/saas", silentRequest);
        setSaas(saasRes.data);
      } catch {
        /* SaaS opcional */
      }
    }
  }

  useEffect(() => {
    void loadAll();
  }, [membersPage, membersPerPage, memberStatusFilter, memberBranchFilter, memberSearch, financeBranchFilter, productBranchFilter]);

  useEffect(() => {
    if (!notifications.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notifiedKey = `gym-notified-${user?.id ?? "guest"}`;
    const notifiedIds = new Set(JSON.parse(localStorage.getItem(notifiedKey) ?? "[]") as number[]);
    const pending = notifications.filter((item) => !item.read_at && !notifiedIds.has(Number(item.id))).slice(0, 3);
    pending.forEach((item) => {
      new Notification(item.title ?? "Nueva notificación", {
        body: item.body ?? "Tienes una nueva alerta del gimnasio.",
        icon: "/favicon.ico",
        tag: `gym-${item.id}`,
      });
      notifiedIds.add(Number(item.id));
    });
    if (pending.length) localStorage.setItem(notifiedKey, JSON.stringify(Array.from(notifiedIds).slice(-100)));
  }, [notifications, user?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      httpClient.get("/api/gym/notifications").then((response) => setNotifications(response.data)).catch(() => undefined);
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  async function enableBrowserNotifications() {
    if (typeof Notification === "undefined") {
      setErrorModal({ title: "Notificaciones no disponibles", message: "Este navegador no permite notificaciones en este dispositivo." });
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserNotificationsEnabled(permission === "granted");
    setMessage(permission === "granted" ? "Notificaciones del navegador activadas." : "No se activaron las notificaciones del navegador.");
  }

  async function markNotificationsAsRead() {
    await httpClient.post("/api/gym/notifications/read");
    const response = await httpClient.get("/api/gym/notifications");
    setNotifications(response.data);
  }

  function openNewMember() {
    setEditingMemberId(null);
    setMemberModalContext("general");
    setMemberForm({ ...emptyMember, branch_id: branches[0]?.id ? String(branches[0].id) : "" });
    setMemberModalOpen(true);
  }

  function openTrainingMemberModal() {
    setEditingMemberId(null);
    setMemberModalContext("training");
    setMemberForm({ ...emptyMember, branch_id: branches[0]?.id ? String(branches[0].id) : "" });
    setMemberModalOpen(true);
  }

  async function openMemberMemberships(member: AnyRow) {
    setSelectedMember(member);
    setSaleForm({ member_id: String(member.id), plan_id: "", starts_on: new Date().toISOString().slice(0, 10), discount: "0", method: "cash", proof_photo: null, notes: "" });
    const response = await httpClient.get(`/api/gym/members/${member.id}/memberships`);
    setMemberMemberships(response.data);
    setMemberMembershipModalOpen(true);
  }

  async function createFitnessGoal(name: string) {
    const cleanName = name.trim();
    if (!cleanName) return;
    const response = await httpClient.post("/api/gym/fitness-goals", { name: cleanName });
    setFitnessGoals((current) => [...current, response.data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
    setMemberForm((current: AnyRow) => ({ ...current, fitness_goal: response.data.name }));
  }

  function openEditMember(member: AnyRow) {
    setEditingMemberId(member.id);
    setMemberModalContext("general");
    setMemberForm({
      ...emptyMember,
      ...member,
      dni: member.dni === "0" ? "" : member.dni,
      document_number: member.document_number === "0" ? "" : member.document_number,
      branch_id: member.branch_id ? String(member.branch_id) : "",
    });
    setMemberModalOpen(true);
  }

  async function saveMember(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = { ...memberForm, document_number: memberForm.dni, branch_id: memberForm.branch_id || null };
    let savedMember: AnyRow | null = null;
    if (editingMemberId) {
      const response = await httpClient.put(`/api/gym/members/${editingMemberId}`, payload);
      savedMember = response.data;
      setMessage("Socio actualizado correctamente.");
    } else {
      const response = await httpClient.post("/api/gym/members", payload);
      savedMember = response.data;
      setMessage("Socio registrado correctamente.");
    }
    setMemberModalOpen(false);
    await loadAll();
    if (memberModalContext === "training" && savedMember?.id) {
      setTrainingSubscriptionForm((current: AnyRow) => ({ ...current, member_id: String(savedMember.id) }));
      setMembers((current) => current.some((member) => Number(member.id) === Number(savedMember?.id)) ? current : [savedMember as AnyRow, ...current]);
      setTrainingSubscriptionModalOpen(true);
    }
    setMemberModalContext("general");
  }

  async function lookupDni(dni: string) {
    const cleanDni = String(dni || "").trim();
    if (!/^\d{8}$/.test(cleanDni)) {
      setMessage("Ingrese un DNI válido de 8 dígitos.");
      return;
    }

    const response = await httpClient.get("/api/reniec", { params: { dni: cleanDni } });
    const payload = response.data;
    setMemberForm((current: AnyRow) => ({
      ...current,
      dni: cleanDni,
      document_number: cleanDni,
      first_name: String(payload?.first_name ?? payload?.nombres ?? "").trim(),
      last_name: String(payload?.last_name ?? "").trim() || [payload?.apellido_paterno, payload?.apellido_materno].filter(Boolean).join(" "),
      birthdate: payload?.fecha_nacimiento || current.birthdate || "",
      gender: payload?.genero || current.gender || "",
    }));
    setMessage("Datos RENIEC cargados correctamente.");
  }

  function confirmDeleteMember(member: AnyRow) {
    setConfirm({
      title: "Desactivar socio",
      body: `¿Deseas eliminar o desactivar a ${member.first_name} ${member.last_name}? Si tiene historial, se conservará y quedará inactivo.`,
      onConfirm: async () => {
        const response = await httpClient.delete(`/api/gym/members/${member.id}`);
        setMessage(response.data?.message ?? "Socio eliminado correctamente.");
        await loadAll();
      },
    });
  }

  function openNewPlan() {
    setEditingPlanId(null);
    setPlanForm(emptyPlan);
    setPlanModalOpen(true);
  }

  function openEditPlan(plan: AnyRow) {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name ?? "",
      code: plan.code ?? "",
      price: String(plan.price ?? ""),
      duration_days: String(plan.duration_days ?? 30),
      grace_days: String(plan.grace_days ?? 0),
      daily_access_limit: plan.daily_access_limit ? String(plan.daily_access_limit) : "",
      includes_classes: Boolean(plan.includes_classes),
      includes_trainer: Boolean(plan.includes_trainer),
      description: plan.description ?? "",
      is_active: Boolean(plan.is_active),
    });
    setPlanModalOpen(true);
  }

  async function savePlan(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = {
      ...planForm,
      code: String(planForm.code).trim().toUpperCase(),
      price: Number(planForm.price),
      duration_days: Number(planForm.duration_days),
      grace_days: Number(planForm.grace_days),
      daily_access_limit: planForm.daily_access_limit === "" ? null : Number(planForm.daily_access_limit),
      includes_classes: Boolean(planForm.includes_classes),
      includes_trainer: Boolean(planForm.includes_trainer),
      is_active: Boolean(planForm.is_active),
    };
    if (editingPlanId) {
      await httpClient.put(`/api/gym/plans/${editingPlanId}`, payload);
      setMessage("Plan actualizado correctamente.");
    } else {
      await httpClient.post("/api/gym/plans", payload);
      setMessage("Plan creado correctamente.");
    }
    setPlanModalOpen(false);
    await loadAll();
  }

  function confirmDeletePlan(plan: AnyRow) {
    setConfirm({
      title: "Eliminar plan",
      body: `¿Deseas eliminar o desactivar el plan "${plan.name}"? Si tiene ventas asociadas, se desactivará para conservar histórico.`,
      onConfirm: async () => {
        const response = await httpClient.delete(`/api/gym/plans/${plan.id}`);
        setMessage(response.data?.message ?? "Plan eliminado correctamente.");
        await loadAll();
      },
    });
  }

  function openNewEquipment() {
    setEditingEquipmentId(null);
    setEquipmentForm({ ...emptyEquipment, branch_id: branches[0]?.id ? String(branches[0].id) : "" });
    setEquipmentModalOpen(true);
  }

  function openEditEquipment(item: AnyRow) {
    setEditingEquipmentId(item.id);
    setEquipmentForm({
      name: item.name ?? "",
      code: item.code ?? "",
      branch_id: item.branch_id ? String(item.branch_id) : "",
      purchased_on: item.purchased_on ?? "",
      next_maintenance_on: item.next_maintenance_on ?? "",
      status: item.status ?? "operational",
      notes: item.notes ?? "",
    });
    setEquipmentModalOpen(true);
  }

  async function saveEquipment(event: FormEvent) {
    event.preventDefault();
    const payload = { ...equipmentForm, branch_id: equipmentForm.branch_id || null };
    if (editingEquipmentId) {
      await httpClient.put(`/api/gym/equipment/${editingEquipmentId}`, payload);
      setMessage("Equipo actualizado correctamente.");
    } else {
      await httpClient.post("/api/gym/equipment", payload);
      setMessage("Equipo registrado correctamente.");
    }
    setEquipmentModalOpen(false);
    setEditingEquipmentId(null);
    await loadAll();
  }

  function confirmDeleteEquipment(item: AnyRow) {
    setConfirm({
      title: "Eliminar equipo",
      body: `¿Deseas eliminar "${item.name}" del inventario?`,
      onConfirm: async () => {
        const response = await httpClient.delete(`/api/gym/equipment/${item.id}`);
        setMessage(response.data?.message ?? "Equipo eliminado correctamente.");
        await loadAll();
      },
    });
  }

  function openNewProduct() {
    setSelectedProduct(null);
    setProductForm({ ...emptyProduct, branch_id: defaultBranchId(user, branches) });
    setProductModalOpen(true);
  }

  function openEditProduct(product: AnyRow) {
    setSelectedProduct(product);
    setProductForm({
      code: product.code ?? "",
      name: product.name ?? "",
      description: product.description ?? "",
      unit_cost: String(product.unit_cost ?? "0"),
      unit_price: String(product.unit_price ?? "0"),
      stock: String(product.stock ?? "0"),
      min_stock: String(product.min_stock ?? "0"),
      branch_id: product.branch_id ? String(product.branch_id) : "",
      is_active: Boolean(product.is_active),
    });
    setProductModalOpen(true);
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = {
      ...productForm,
      stock: Number(productForm.stock),
      unit_cost: Number(productForm.unit_cost),
      unit_price: Number(productForm.unit_price),
      min_stock: productForm.min_stock === "" ? null : Number(productForm.min_stock),
      branch_id: productForm.branch_id || null,
      is_active: Boolean(productForm.is_active),
    };

    if (selectedProduct?.id) {
      await httpClient.put(`/api/gym/products/${selectedProduct.id}`, payload);
      setMessage("Producto actualizado correctamente.");
    } else {
      await httpClient.post("/api/gym/products", payload);
      setMessage("Producto registrado correctamente.");
    }

    setProductModalOpen(false);
    setSelectedProduct(null);
    await loadAll();
  }

  function confirmDeleteProduct(item: AnyRow) {
    setConfirm({
      title: "Eliminar producto",
      body: `¿Deseas eliminar o desactivar el producto "${item.name}"? Si tiene ventas o movimientos, se conservará y quedará inactivo.`,
      onConfirm: async () => {
        const response = await httpClient.delete(`/api/gym/products/${item.id}`);
        setMessage(response.data?.message ?? "Producto eliminado correctamente.");
        await loadAll();
      },
    });
  }

  function openSellProduct(product: AnyRow) {
    setSelectedProduct(product);
    setProductSaleForm({
      ...emptyProductSale,
      product_id: String(product.id),
      unit_price: String(product.unit_price ?? "0"),
      quantity: "1",
      sale_date: new Date().toISOString().slice(0, 10),
    });
    setProductSaleModalOpen(true);
  }

  async function saveProductSale(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setErrorModal(null);
    try {
      const formData = new FormData();
      for (const [key, value] of Object.entries(productSaleForm)) await appendFormValue(formData, key, value);
      await httpClient.post("/api/gym/product-sales", formData, { errorTitle: "No se pudo registrar la venta" });
      setMessage("Venta de producto registrada correctamente.");
      setProductSaleModalOpen(false);
      setSelectedProduct(null);
      await loadAll();
    } catch {
      /* El interceptor muestra el modal de error */
    }
  }

  function openStockPurchase(product: AnyRow) {
    setSelectedProduct(product);
    setStockPurchaseForm({
      ...emptyStockPurchase,
      unit_cost: String(product.unit_cost ?? "0"),
      purchased_on: new Date().toISOString().slice(0, 10),
    });
    setStockPurchaseModalOpen(true);
  }

  async function saveStockPurchase(event: FormEvent) {
    event.preventDefault();
    if (!selectedProduct?.id) return;
    setMessage("");
    await httpClient.post(`/api/gym/products/${selectedProduct.id}/stock-purchase`, {
      quantity: Number(stockPurchaseForm.quantity),
      unit_cost: Number(stockPurchaseForm.unit_cost),
      purchased_on: stockPurchaseForm.purchased_on,
      notes: stockPurchaseForm.notes,
    });
    setStockPurchaseModalOpen(false);
    setSelectedProduct(null);
    setMessage("Ingreso de mercadería registrado.");
    await loadAll();
  }

  function openCollectPayment(payment: AnyRow) {
    setSelectedReceivable(payment);
    setCollectPaymentForm({
      ...emptyCollectPayment,
      payment_id: String(payment.payment_id ?? payment.id),
      amount: String(payment.balance_due ?? payment.amount ?? ""),
      paid_on: new Date().toISOString().slice(0, 10),
    });
    setCollectPaymentModalOpen(true);
  }

  async function saveCollectPayment(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData();
    for (const [key, value] of Object.entries(collectPaymentForm)) {
      if (key === "payment_id") continue;
      await appendFormValue(formData, key, value);
    }
    await httpClient.post(`/api/gym/payments/${collectPaymentForm.payment_id}/collect`, formData);
    setCollectPaymentModalOpen(false);
    setSelectedReceivable(null);
    setMessage("Cobro registrado correctamente.");
    await loadAll();
  }

  async function openProductKardex(product: AnyRow) {
    setSelectedProduct(product);
    const response = await httpClient.get("/api/gym/product-movements", { params: { product_id: product.id } });
    setProductMovements(response.data);
    setProductKardexModalOpen(true);
  }

  async function sellMembership(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData();
    for (const [key, value] of Object.entries(saleForm)) await appendFormValue(formData, key, value);
    await httpClient.post("/api/gym/memberships", formData);
    setSaleModalOpen(false);
    if (memberMembershipModalOpen && selectedMember) {
      const response = await httpClient.get(`/api/gym/members/${selectedMember.id}/memberships`);
      setMemberMemberships(response.data);
    }
    setMessage("Membresía vendida y pago registrado.");
    await loadAll();
  }

  async function checkIn(memberId: number) {
    setMessage("");
    await httpClient.post("/api/gym/attendance/check-in", { member_id: memberId });
    setMessage("Ingreso registrado.");
    await loadAll();
  }

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    for (const [key, value] of Object.entries(expenseForm)) await appendFormValue(formData, key, value);
    await httpClient.post("/api/gym/expenses", formData);
    setExpenseForm({ category: "Servicios", description: "", supplier: "", amount: "", spent_on: new Date().toISOString().slice(0, 10), payment_method: "cash", proof_photo: null });
    setExpenseModalOpen(false);
    setMessage("Gasto registrado.");
    await loadAll();
  }

  async function saveExternalIncome(event: FormEvent) {
    event.preventDefault();
    const formData = new FormData();
    for (const [key, value] of Object.entries(incomeForm)) await appendFormValue(formData, key, value);
    await httpClient.post("/api/gym/payments", formData);
    setIncomeForm({ category: "Venta externa", concept: "", payer_name: "", branch_id: defaultBranchId(user, branches), amount: "", paid_on: new Date().toISOString().slice(0, 10), due_on: "", method: "cash", status: "paid", proof_photo: null, notes: "" });
    setIncomeModalOpen(false);
    setMessage("Ingreso externo registrado.");
    await loadAll();
  }

  function openNewClass() {
    setEditingClassId(null);
    setClassForm({ ...emptyClassForm, branch_id: branches[0]?.id ? String(branches[0].id) : "" });
    setClassModalOpen(true);
  }

  function openEditClass(gymClass: AnyRow) {
    setEditingClassId(gymClass.id);
    setClassForm({
      name: gymClass.name ?? "",
      category: gymClass.category ?? "MMA",
      level: gymClass.level ?? "Todos",
      branch_id: gymClass.branch_id ? String(gymClass.branch_id) : "",
      room: gymClass.room ?? "",
      trainer_id: gymClass.trainer_id ? String(gymClass.trainer_id) : "",
      weekday: gymClass.weekday ?? "Lunes",
      starts_at: String(gymClass.starts_at ?? "19:00").slice(0, 5),
      ends_at: String(gymClass.ends_at ?? "20:00").slice(0, 5),
      capacity: String(gymClass.capacity ?? 20),
      color: gymClass.color ?? "#ffcc00",
      description: gymClass.description ?? "",
      is_active: Boolean(gymClass.is_active),
    });
    setClassModalOpen(true);
  }

  async function saveClass(event: FormEvent) {
    event.preventDefault();
    const payload = {
      ...classForm,
      branch_id: classForm.branch_id || null,
      trainer_id: classForm.trainer_id || null,
      capacity: Number(classForm.capacity),
      is_active: Boolean(classForm.is_active),
    };
    if (editingClassId) {
      await httpClient.put(`/api/gym/classes/${editingClassId}`, payload);
      setMessage("Clase actualizada correctamente.");
    } else {
      await httpClient.post("/api/gym/classes", payload);
      setMessage("Clase creada correctamente.");
    }
    setClassModalOpen(false);
    await loadAll();
  }

  function confirmDeleteClass(gymClass: AnyRow) {
    setConfirm({
      title: "Eliminar clase",
      body: `¿Deseas eliminar o desactivar "${gymClass.name}"? Si tiene reservas, se desactivará para conservar histórico.`,
      onConfirm: async () => {
        const response = await httpClient.delete(`/api/gym/classes/${gymClass.id}`);
        setMessage(response.data?.message ?? "Clase eliminada correctamente.");
        await loadAll();
      },
    });
  }

  async function openClassDetail(gymClass: AnyRow) {
    setSelectedClass(gymClass);
    const date = nextDateForWeekday(gymClass.weekday);
    setClassBookingDate(date);
    setClassBookingMemberId("");
    const response = await httpClient.get(`/api/gym/classes/${gymClass.id}/bookings`, { params: { date } });
    setClassBookings(response.data);
    setClassDetailOpen(true);
  }

  async function reloadClassBookings(date = classBookingDate) {
    if (!selectedClass) return;
    const response = await httpClient.get(`/api/gym/classes/${selectedClass.id}/bookings`, { params: { date } });
    setClassBookings(response.data);
  }

  async function reserveClass(event: FormEvent) {
    event.preventDefault();
    if (!selectedClass) return;
    await httpClient.post(`/api/gym/classes/${selectedClass.id}/bookings`, { member_id: classBookingMemberId, booking_date: classBookingDate });
    setClassBookingMemberId("");
    await reloadClassBookings();
  }

  async function checkInClassBooking(booking: AnyRow) {
    await httpClient.post(`/api/gym/class-bookings/${booking.id}/check-in`);
    await reloadClassBookings();
  }

  async function cancelClassBooking(booking: AnyRow) {
    await httpClient.post(`/api/gym/class-bookings/${booking.id}/cancel`);
    await reloadClassBookings();
  }

  void openNewClass;
  void openEditClass;
  void confirmDeleteClass;
  void openClassDetail;

  function openTrainingSubscription() {
    setEditingTrainingSubscriptionId(null);
    setTrainingSubscriptionForm(emptyTrainingSubscriptionForm);
    setTrainingSubscriptionModalOpen(true);
  }

  function openEditTrainingSubscription(subscription: AnyRow) {
    setEditingTrainingSubscriptionId(subscription.id);
    setTrainingSubscriptionForm({
      ...emptyTrainingSubscriptionForm,
      ...subscription,
      member_id: String(subscription.member_id ?? ""),
      monthly_fee: String(subscription.monthly_fee ?? ""),
      starts_on: String(subscription.starts_on ?? new Date().toISOString().slice(0, 10)),
      selected_days: subscription.selected_days ?? [],
      day_schedules: subscription.day_schedules ?? {},
      sessions_per_week: String(subscription.sessions_per_week ?? (subscription.selected_days?.length || 1)),
      proof_url: subscription.proof_url ?? "",
      proof_photo: null,
    });
    setTrainingSubscriptionModalOpen(true);
  }

  function openTrainingSubscriptionDetail(subscription: AnyRow) {
    setTrainingSubscriptionDetail(subscription);
  }

  function confirmDeleteTrainingSubscription(subscription: AnyRow) {
    setConfirm({
      title: "Cancelar mensualidad",
      body: `¿Deseas cancelar la mensualidad de ${subscription.member_name}? Se conservará el histórico.`,
      onConfirm: async () => {
        const response = await httpClient.delete(`/api/gym/training-subscriptions/${subscription.id}`);
        setMessage(response.data?.message ?? "Mensualidad cancelada correctamente.");
        await loadAll();
      },
    });
  }

  async function saveTrainingSubscription(event: FormEvent) {
    event.preventDefault();
    if (trainingSubscriptionSaving) return;
    setMessage("");
    setErrorModal(null);
    setTrainingSubscriptionSaving(true);
    const formData = new FormData();
    try {
      for (const [key, value] of Object.entries(trainingSubscriptionForm)) {
        if (key === "proof_url" || (key.startsWith("payment_") && key !== "payment_method")) continue;
        if (key === "selected_days" && Array.isArray(value)) {
          value.forEach((day) => formData.append("selected_days[]", day));
        } else if (key === "day_schedules") {
          formData.append("day_schedules", JSON.stringify(value ?? {}));
        } else {
          await appendFormValue(formData, key, value);
        }
      }
      if (editingTrainingSubscriptionId) {
        formData.append("_method", "PUT");
        await httpClient.post(`/api/gym/training-subscriptions/${editingTrainingSubscriptionId}`, formData);
      } else {
        await httpClient.post("/api/gym/training-subscriptions", formData);
      }
      setEditingTrainingSubscriptionId(null);
      setTrainingSubscriptionModalOpen(false);
      setClassesViewMode("tabla");
      setMessage(editingTrainingSubscriptionId ? "Mensualidad actualizada correctamente." : "Mensualidad registrada correctamente.");
      await loadAll();
    } catch (error) {
      const friendly = parseApiError(
        error,
        editingTrainingSubscriptionId ? "No se pudo actualizar la mensualidad" : "No se pudo registrar la mensualidad",
      );
      setErrorModal({
        title: friendly.title,
        message: friendly.message,
        details: friendly.details,
        sessionExpired: friendly.sessionExpired,
      });
    } finally {
      setTrainingSubscriptionSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5ef] pb-20 text-zinc-950 lg:pb-0">
      {mobileMenuOpen ? <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-zinc-950/55 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(88vw,320px)] flex-col bg-zinc-950 text-white shadow-2xl transition-transform duration-300 lg:w-72 lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5 sm:px-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#ffcc00] text-zinc-950"><Dumbbell className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold uppercase tracking-[0.35em] text-[#ffcc00]">GymPro GO</p><p className="truncate text-lg font-black">Sistema de gimnasio</p></div>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-xl p-2 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Cerrar menú"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => selectTab(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${tab === item.id ? "bg-[#ffcc00] text-zinc-950" : "text-zinc-300 hover:bg-white/10 hover:text-white"}`}><Icon className="h-5 w-5 shrink-0" />{item.label}</button>;
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-bold">{user?.name}</p>
          <p className="truncate text-xs text-zinc-400">{user?.role_name ?? "Operador"}</p>
          <button onClick={() => void logout()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-white/10"><LogOut className="h-4 w-4" /> Salir</button>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 relative border-b border-zinc-200 bg-white/90 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-8 lg:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileMenuOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm lg:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[#d9a900] sm:text-xs sm:tracking-[0.28em]">Gestión profesional</p>
                <h1 className="truncate text-xl font-black sm:text-2xl">{headerBranchName}</h1>
                <p className="mt-0.5 text-xs font-bold text-zinc-500 lg:hidden">{currentTab.label}</p>
              </div>
            </div>
            <div className="flex w-full items-center rounded-2xl border border-zinc-200 bg-white px-3 shadow-sm lg:ml-auto lg:min-w-[360px] lg:max-w-lg">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (setMembersPage(1), setMemberSearch(search))} placeholder="Buscar socio, DNI o código" className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none" />
              <button onClick={() => { setMembersPage(1); setMemberSearch(search); }} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white">Buscar</button>
            </div>
            <div className="absolute right-3 top-3 z-30 lg:static lg:ml-0">
              <button type="button" onClick={() => setNotificationPanelOpen((open) => !open)} className="relative grid h-11 w-11 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm" aria-label="Ver notificaciones">
                <Bell className="h-5 w-5" />
                {unreadNotifications.length ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ffcc00] px-1 text-[10px] font-black text-zinc-950">{unreadNotifications.length}</span> : null}
              </button>
              {notificationPanelOpen ? <NotificationPanel notifications={notifications} browserEnabled={browserNotificationsEnabled} onEnableBrowser={() => void enableBrowserNotifications()} onMarkRead={() => void markNotificationsAsRead()} onClose={() => setNotificationPanelOpen(false)} /> : null}
            </div>
          </div>
          {message ? <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">{message}</div> : null}
        </header>

        <section className="space-y-5 p-3 sm:p-4 lg:space-y-6 lg:p-8">
          {tab === "dashboard" ? <Dashboard dashboard={dashboard} activeMembers={activeMembers.length} membershipsCount={memberships.length} notifications={notifications} members={members} memberships={memberships} payments={payments} attendance={attendance} trainingSubscriptions={trainingSubscriptions} onOpenCredential={setCredentialMember} /> : null}
          {tab === "members" ? <Module title="Socios" subtitle="Base de clientes, datos de contacto y control operativo." onNew={openNewMember} newLabel="Nuevo socio">
            <div className="mb-4 grid gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
              <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><span>Estado</span><SearchableSelect value={memberStatusFilter} onChange={(value) => { setMembersPage(1); setMemberStatusFilter(value); }} options={memberStatusFilterOptions.slice(1)} emptyOption={memberStatusFilterOptions[0]} className={fieldClass()} /></label>
              <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><span>Sede</span><SearchableSelect value={memberBranchFilter} onChange={(value) => { setMembersPage(1); setMemberBranchFilter(value); }} options={branchOptions(branches)} emptyOption={{ value: "", label: "Todas" }} className={fieldClass()} /></label>
              <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><span>Registros por página</span><SearchableSelect value={String(membersPerPage)} onChange={(value) => { setMembersPage(1); setMembersPerPage(Number(value)); }} options={pageSizeOptions} className={fieldClass()} /></label>
            </div>
            <DataTable title="Socios registrados" rows={members} columns={["member_code", "dni", "first_name", "last_name", "phone", "status", "branch_name"]} action={(row) => <ActionButtons onEdit={() => openEditMember(row)} onDelete={() => confirmDeleteMember(row)} extra={<><IconButton title="Credencial digital" onClick={() => setCredentialMember(row)} className="bg-white text-zinc-950 ring-1 ring-zinc-200"><QrCode className="h-4 w-4" /></IconButton><button onClick={() => void checkIn(row.id)} className="rounded-xl bg-[#ffcc00] px-3 py-2 text-xs font-black text-zinc-950">Ingreso</button><button onClick={() => void openMemberMemberships(row)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Membresías</button></>} />} />
            <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-zinc-500">Mostrando {members.length} de {memberTotal} resultados</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={membersPage <= 1} onClick={() => setMembersPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">Anterior</button>
                <span className="text-xs text-zinc-500">Página {membersPage}</span>
                <button type="button" disabled={members.length < membersPerPage} onClick={() => setMembersPage((current) => current + 1)} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">Siguiente</button>
              </div>
            </div>
          </Module> : null}
          {tab === "plans" ? <Module title="Planes" subtitle="Membresías, precios, duración y beneficios comerciales." onNew={openNewPlan} newLabel="Nuevo plan"><DataTable title="Planes del gimnasio" rows={plans} columns={["code", "name", "price", "duration_days", "grace_days", "daily_access_limit", "includes_classes", "includes_trainer", "is_active"]} action={(row) => <ActionButtons onEdit={() => openEditPlan(row)} onDelete={() => confirmDeletePlan(row)} />} /></Module> : null}
          {tab === "memberships" ? <Module title="Membresías" subtitle="Ventas, renovaciones y activaciones de socios." onNew={() => setSaleModalOpen(true)} newLabel="Nueva venta"><DataTable title="Membresías activadas" rows={memberships} columns={["member_name", "plan_name", "starts_on", "ends_on", "price", "discount", "status"]} /></Module> : null}
          {tab === "attendance" ? <Module title="Accesos" subtitle="Historial de ingreso y validación de membresías."><DataTable title="Control de accesos" rows={attendance} columns={["member_name", "checked_in_at", "checked_out_at", "notes"]} /></Module> : null}
          {tab === "classes" ? <ClassesModule subscriptions={trainingSubscriptions} viewMode={classesViewMode} onViewModeChange={setClassesViewMode} onNewSubscription={openTrainingSubscription} onEdit={openEditTrainingSubscription} onDetail={openTrainingSubscriptionDetail} onDelete={confirmDeleteTrainingSubscription} /> : null}
          {tab === "products" ? <ProductsModule products={products} productSales={productSales} branches={branches} branchFilter={productBranchFilter} onBranchFilterChange={setProductBranchFilter} onNewProduct={openNewProduct} onSellProduct={openSellProduct} onStockPurchase={openStockPurchase} onKardex={openProductKardex} onEditProduct={openEditProduct} onDeleteProduct={confirmDeleteProduct} onNewSale={() => { setSelectedProduct(null); setProductSaleForm({ ...emptyProductSale, sale_date: new Date().toISOString().slice(0, 10) }); setProductSaleModalOpen(true); }} /> : null}
          {tab === "equipment" ? <Module title="Equipos" subtitle="Activos, estado operativo y próximos mantenimientos." onNew={openNewEquipment} newLabel="Nuevo equipo"><DataTable title="Equipos y mantenimiento" rows={equipment} columns={["code", "name", "status", "next_maintenance_on", "notes"]} action={(row) => <ActionButtons onEdit={() => openEditEquipment(row)} onDelete={() => confirmDeleteEquipment(row)} />} /></Module> : null}
          {tab === "finance" ? <FinanceModule movements={cashMovements} payments={payments} expenses={expenses} branches={branches} branchFilter={financeBranchFilter} onBranchFilterChange={setFinanceBranchFilter} onNewIncome={() => { setIncomeForm((current) => ({ ...current, branch_id: defaultBranchId(user, branches) })); setIncomeModalOpen(true); }} onNewExpense={() => setExpenseModalOpen(true)} onCollectPayment={openCollectPayment} /> : null}
          {tab === "system" && user?.is_superadmin ? <SystemAdminPanel data={saas} reload={loadAll} /> : null}
        </section>
      </main>

      <BottomNav tab={tab} onSelect={selectTab} tabs={visibleTabs.filter((item) => item.id !== "system")} />
      <PlanModal open={planModalOpen} editing={Boolean(editingPlanId)} form={planForm} onChange={setPlanForm} onClose={() => setPlanModalOpen(false)} onSubmit={savePlan} />
      <SaleModal open={saleModalOpen} form={saleForm} members={members} plans={plans} onChange={setSaleForm} onClose={() => setSaleModalOpen(false)} onSubmit={sellMembership} />
      <MemberMembershipModal open={memberMembershipModalOpen} member={selectedMember} rows={memberMemberships} saleForm={saleForm} plans={plans} onSaleChange={setSaleForm} onClose={() => setMemberMembershipModalOpen(false)} onSubmit={sellMembership} />
      <IncomeModal open={incomeModalOpen} form={incomeForm} branches={branches} onChange={setIncomeForm} onClose={() => setIncomeModalOpen(false)} onSubmit={saveExternalIncome} />
      <CollectPaymentModal open={collectPaymentModalOpen} payment={selectedReceivable} form={collectPaymentForm} onChange={setCollectPaymentForm} onClose={() => { setCollectPaymentModalOpen(false); setSelectedReceivable(null); }} onSubmit={saveCollectPayment} />
      <StockPurchaseModal open={stockPurchaseModalOpen} product={selectedProduct} form={stockPurchaseForm} onChange={setStockPurchaseForm} onClose={() => { setStockPurchaseModalOpen(false); setSelectedProduct(null); }} onSubmit={saveStockPurchase} />
      <ProductModal open={productModalOpen} editing={Boolean(selectedProduct)} form={productForm} branches={branches} onChange={setProductForm} onClose={() => { setProductModalOpen(false); setSelectedProduct(null); }} onSubmit={saveProduct} />
      <ProductSaleModal open={productSaleModalOpen} form={productSaleForm} products={products} members={members} onChange={setProductSaleForm} onClose={() => { setProductSaleModalOpen(false); setSelectedProduct(null); }} onSubmit={saveProductSale} />
      <ProductKardexModal open={productKardexModalOpen} rows={productMovements} onClose={() => setProductKardexModalOpen(false)} />
      <ExpenseModal open={expenseModalOpen} form={expenseForm} onChange={setExpenseForm} onClose={() => setExpenseModalOpen(false)} onSubmit={saveExpense} />
      <EquipmentModal open={equipmentModalOpen} editing={Boolean(editingEquipmentId)} form={equipmentForm} branches={branches} onChange={setEquipmentForm} onClose={() => { setEquipmentModalOpen(false); setEditingEquipmentId(null); }} onSubmit={saveEquipment} />
      <ClassModal open={classModalOpen} editing={Boolean(editingClassId)} form={classForm} branches={branches} onChange={setClassForm} onClose={() => setClassModalOpen(false)} onSubmit={saveClass} />
      <ClassDetailModal open={classDetailOpen} gymClass={selectedClass} members={members} rows={classBookings} bookingDate={classBookingDate} selectedMemberId={classBookingMemberId} onDateChange={(date) => { setClassBookingDate(date); void reloadClassBookings(date); }} onMemberChange={setClassBookingMemberId} onReserve={reserveClass} onCheckIn={checkInClassBooking} onCancel={cancelClassBooking} onClose={() => setClassDetailOpen(false)} />
      <TrainingSubscriptionModal open={trainingSubscriptionModalOpen} editing={Boolean(editingTrainingSubscriptionId)} form={trainingSubscriptionForm} members={members} onCreateMember={openTrainingMemberModal} onChange={setTrainingSubscriptionForm} onClose={() => { setEditingTrainingSubscriptionId(null); setTrainingSubscriptionModalOpen(false); }} onSubmit={saveTrainingSubscription} />
      <TrainingSubscriptionDetailModal subscription={trainingSubscriptionDetail} onClose={() => setTrainingSubscriptionDetail(null)} onEdit={(subscription) => { setTrainingSubscriptionDetail(null); openEditTrainingSubscription(subscription); }} />
      <MemberCredentialModal member={credentialMember} membership={credentialMember ? memberActiveMembership(credentialMember, memberships) : null} onClose={() => setCredentialMember(null)} onCheckIn={(memberId) => void checkIn(memberId)} />
      <MemberModal open={memberModalOpen} editing={Boolean(editingMemberId)} form={memberForm} branches={branches} fitnessGoals={fitnessGoals} onCreateGoal={createFitnessGoal} onChange={setMemberForm} onSearchDni={lookupDni} onClose={() => { setMemberModalContext("general"); setMemberModalOpen(false); }} onSubmit={saveMember} />
      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
      <ErrorModal state={errorModal} onClose={() => setErrorModal(null)} onGoToLogin={goToLogin} />
    </div>
  );
}

function Dashboard({ dashboard, activeMembers, membershipsCount, notifications, members, memberships, payments, attendance, trainingSubscriptions, onOpenCredential }: { dashboard: AnyRow; activeMembers: number; membershipsCount: number; notifications: AnyRow[]; members: AnyRow[]; memberships: AnyRow[]; payments: AnyRow[]; attendance: AnyRow[]; trainingSubscriptions: AnyRow[]; onOpenCredential: (member: AnyRow) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">{(dashboard.kpis ?? []).map((kpi: AnyRow) => <div key={kpi.label} className={cardClass()}><p className="text-xs font-bold text-zinc-500 sm:text-sm">{kpi.label}</p><p className="mt-2 text-2xl font-black sm:text-3xl">{kpi.value}</p><p className="mt-2 text-[11px] font-semibold text-zinc-400 sm:text-xs">{kpi.hint}</p></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className={`${cardClass()} xl:col-span-2`}><h2 className="text-lg font-black">Operación de hoy</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard title="Ingresos hoy" value={dashboard.attendance_today ?? 0} yellow /><MetricCard title="Socios activos" value={activeMembers} dark /><MetricCard title="Planes vendidos" value={membershipsCount} /></div></div>
        <div className={cardClass()}><h2 className="text-lg font-black">Notificaciones</h2><div className="mt-3 space-y-3">{notifications.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl bg-amber-50 p-3 text-sm"><b>{item.title}</b><p className="text-zinc-600">{item.body}</p></div>)}</div></div>
      </div>
      <PremiumCommandCenter members={members} memberships={memberships} payments={payments} attendance={attendance} trainingSubscriptions={trainingSubscriptions} onOpenCredential={onOpenCredential} />
    </>
  );
}

function PremiumCommandCenter({ members, memberships, payments, attendance, trainingSubscriptions, onOpenCredential }: { members: AnyRow[]; memberships: AnyRow[]; payments: AnyRow[]; attendance: AnyRow[]; trainingSubscriptions: AnyRow[]; onOpenCredential: (member: AnyRow) => void }) {
  const expiring = memberships.filter((item) => item.status === "active" && (daysUntil(item.ends_on) ?? 999) >= 0 && (daysUntil(item.ends_on) ?? 999) <= 7);
  const expired = memberships.filter((item) => item.status === "active" && (daysUntil(item.ends_on) ?? 1) < 0);
  const inactiveMembers = members.filter((member) => {
    const last = lastAttendanceForMember(member, attendance);
    const inactivity = last ? Math.abs(daysUntil(last.checked_in_at) ?? 0) : 99;
    return member.status === "active" && inactivity >= 7;
  });
  const birthdayMembers = members.filter((member) => {
    const date = dateOnly(member.birthdate);
    const today = new Date();
    return date && date.getMonth() === today.getMonth();
  });
  const yapePlin = payments.filter((payment) => ["yape", "plin"].includes(payment.method)).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  const subscriptionIncome = trainingSubscriptions.filter((item) => item.status === "active").reduce((sum, item) => sum + Number(item.monthly_fee ?? 0), 0);
  const priorityMembers = [...expiring, ...expired].slice(0, 5).map((membership) => members.find((member) => Number(member.id) === Number(membership.member_id))).filter(Boolean) as AnyRow[];

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffcc00]">Suite premium</p>
            <h2 className="text-2xl font-black">Retención, portal y crecimiento</h2>
            <p className="mt-1 text-sm text-zinc-400">Acciones inteligentes para reducir fugas, vender más renovaciones y profesionalizar la atención.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-white/10 px-3 py-2">Portal móvil</span>
            <span className="rounded-full bg-white/10 px-3 py-2">WhatsApp</span>
            <span className="rounded-full bg-white/10 px-3 py-2">QR</span>
            <span className="rounded-full bg-white/10 px-3 py-2">Gamificación</span>
          </div>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Vencen en 7 días" value={expiring.length} yellow />
          <MetricCard title="Vencidos por cobrar" value={expired.length} />
          <MetricCard title="Inactivos 7+ días" value={inactiveMembers.length} />
          <MetricCard title="Cumpleaños del mes" value={birthdayMembers.length} />
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className={`${cardClass()} xl:col-span-2`}>
          <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><h3 className="text-lg font-black">Acciones recomendadas</h3></div>
          <div className="space-y-3">
            {priorityMembers.length === 0 ? <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">No hay renovaciones críticas por ahora.</p> : null}
            {priorityMembers.map((member) => {
              const membership = memberActiveMembership(member, memberships);
              const remaining = daysUntil(membership?.ends_on);
              const text = remaining !== null && remaining < 0 ? `Hola ${member.first_name}, tu membresía venció. ¿Deseas renovarla hoy?` : `Hola ${member.first_name}, tu membresía vence pronto. ¿Te ayudo a renovarla?`;
              const url = whatsappUrl(member.phone, text);
              return (
                <div key={member.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="font-black">{memberFullName(member)}</p><p className="text-sm font-semibold text-zinc-500">{remaining !== null && remaining < 0 ? `Vencido hace ${Math.abs(remaining)} días` : `Vence en ${remaining ?? "-"} días`}</p></div>
                  <div className="flex gap-2">
                    <IconButton title="Credencial" onClick={() => onOpenCredential(member)} className="bg-white text-zinc-950 ring-1 ring-zinc-200"><QrCode className="h-4 w-4" /></IconButton>
                    {url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-[#d9a900]" /><h3 className="text-lg font-black">Motor premium</h3></div>
          <div className="space-y-3">
            <MetricCard title="Yape + Plin" value={money(yapePlin)} yellow />
            <MetricCard title="Mensualidades activas" value={money(subscriptionIncome)} />
            <div className="rounded-2xl bg-zinc-950 p-4 text-white">
              <p className="text-sm font-black">Retos y premios</p>
              <p className="mt-1 text-xs text-zinc-400">Usa asistencia y renovaciones para crear rankings, premios y campañas de retención.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, yellow, dark }: { title: string; value: ReactNode; yellow?: boolean; dark?: boolean }) {
  return <div className={`rounded-2xl p-4 ${yellow ? "bg-[#ffcc00] text-zinc-950" : dark ? "bg-zinc-950 text-white" : "bg-white text-zinc-950 ring-1 ring-zinc-200"}`}><p className="text-sm font-bold">{title}</p><p className="text-3xl font-black">{value}</p></div>;
}

function NotificationPanel({ notifications, browserEnabled, onEnableBrowser, onMarkRead, onClose }: { notifications: AnyRow[]; browserEnabled: boolean; onEnableBrowser: () => void; onMarkRead: () => void; onClose: () => void }) {
  const unread = notifications.filter((item) => !item.read_at).length;
  return (
    <div className="absolute right-0 top-14 z-40 w-[min(92vw,420px)] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d9a900]">Centro de alertas</p>
          <h3 className="text-xl font-black">Notificaciones</h3>
          <p className="text-xs font-semibold text-zinc-500">{unread} sin leer · actualización automática</p>
        </div>
        <button onClick={onClose} className="rounded-xl bg-zinc-100 p-2 text-zinc-600"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-2 border-b border-zinc-100 p-3 sm:grid-cols-2">
        <button type="button" onClick={onEnableBrowser} className={`rounded-2xl px-3 py-2 text-xs font-black ${browserEnabled ? "bg-emerald-50 text-emerald-700" : "bg-[#ffcc00] text-zinc-950"}`}>{browserEnabled ? "Navegador activo" : "Activar navegador"}</button>
        <button type="button" onClick={onMarkRead} className="rounded-2xl bg-zinc-950 px-3 py-2 text-xs font-black text-white">Marcar leídas</button>
      </div>
      <div className="max-h-[420px] overflow-y-auto p-3">
        {notifications.length === 0 ? <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">Sin notificaciones por ahora.</p> : null}
        <div className="space-y-2">
          {notifications.map((item) => (
            <article key={item.id} className={`rounded-2xl border p-3 ${item.read_at ? "border-zinc-100 bg-zinc-50" : "border-yellow-200 bg-yellow-50"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at ? "bg-zinc-300" : "bg-[#ffcc00]"}`} />
                <div className="min-w-0">
                  <p className="font-black text-zinc-950">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-600">{item.body}</p>
                  <p className="mt-2 text-[11px] font-black uppercase tracking-wide text-zinc-400">{formatDateTime(item.created_at ?? item.scheduled_for)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Module({ title, subtitle, children, onNew, newLabel }: { title: string; subtitle: string; children: ReactNode; onNew?: () => void; newLabel?: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-zinc-950 p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffcc00]">Administración</p><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-zinc-400">{subtitle}</p></div>
        {onNew ? <button onClick={onNew} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffcc00] px-4 py-3 text-sm font-black text-zinc-950 shadow-lg shadow-yellow-500/20"><Plus className="h-4 w-4" />{newLabel ?? "Nuevo"}</button> : null}
      </div>
      {children}
    </div>
  );
}

function ProductsModule({ products, productSales, branches, branchFilter, onBranchFilterChange, onNewProduct, onSellProduct, onStockPurchase, onKardex, onEditProduct, onDeleteProduct, onNewSale }: { products: AnyRow[]; productSales: AnyRow[]; branches: AnyRow[]; branchFilter: string; onBranchFilterChange: (value: string) => void; onNewProduct: () => void; onSellProduct: (row: AnyRow) => void; onStockPurchase: (row: AnyRow) => void; onKardex: (row: AnyRow) => void; onEditProduct: (row: AnyRow) => void; onDeleteProduct: (row: AnyRow) => void; onNewSale: () => void }) {
  const lowStock = products.filter((product) => product.is_active && product.min_stock != null && Number(product.stock) <= Number(product.min_stock));
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.stock ?? 0) * Number(product.unit_cost ?? 0), 0);
  const salesTotal = productSales.reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-zinc-950 p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffcc00]">Inventario</p><h2 className="text-2xl font-black">Productos y almacén</h2><p className="mt-1 text-sm text-zinc-400">Stock por sede, ventas, compras y kardex en tiempo real.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={onNewSale} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-950"><Plus className="h-4 w-4" />Venta rápida</button>
          <button onClick={onNewProduct} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffcc00] px-4 py-3 text-sm font-black text-zinc-950 shadow-lg shadow-yellow-500/20"><Plus className="h-4 w-4" />Nuevo producto</button>
        </div>
      </div>
      <div className="grid gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><span>Filtrar por sede</span><SearchableSelect value={branchFilter} onChange={onBranchFilterChange} options={branchOptions(branches)} emptyOption={{ value: "", label: "Todas mis sedes" }} className={fieldClass()} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Productos activos" value={products.filter((item) => item.is_active).length} yellow />
        <MetricCard title="Stock bajo" value={lowStock.length} />
        <MetricCard title="Valor inventario" value={money(inventoryValue)} dark />
        <MetricCard title="Ventas registradas" value={money(salesTotal)} />
      </div>
      {lowStock.length ? <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Hay {lowStock.length} producto(s) en stock mínimo: {lowStock.slice(0, 4).map((item) => item.name).join(", ")}{lowStock.length > 4 ? "..." : ""}</div> : null}
      <DataTable title="Catálogo de productos" rows={products} columns={["code", "name", "stock", "unit_price", "min_stock", "branch_name", "is_active"]} action={(row) => <ActionButtons onEdit={() => onEditProduct(row)} onDelete={() => onDeleteProduct(row)} extra={<><button type="button" onClick={() => onSellProduct(row)} className="rounded-xl bg-[#ffcc00] px-3 py-2 text-xs font-black text-zinc-950">Vender</button><button type="button" onClick={() => onStockPurchase(row)} className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">Compra</button><button type="button" onClick={() => onKardex(row)} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-zinc-700 ring-1 ring-zinc-200">Kardex</button></>} />} />
      <DataTable title="Últimas ventas de productos" rows={productSales} columns={["product_name", "member_name", "customer_name", "quantity", "total_amount", "payment_method", "payment_status", "sale_date", "branch_name"]} />
    </div>
  );
}

function FinanceModule({ movements, payments, expenses, branches, branchFilter, onBranchFilterChange, onNewIncome, onNewExpense, onCollectPayment }: { movements: AnyRow[]; payments: AnyRow[]; expenses: AnyRow[]; branches: AnyRow[]; branchFilter: string; onBranchFilterChange: (value: string) => void; onNewIncome: () => void; onNewExpense: () => void; onCollectPayment: (payment: AnyRow) => void }) {
  const methods = ["cash", "yape", "plin", "transfer", "card"];
  const branchScopedPayments = payments.filter(hasAssignedBranch);
  const branchScopedExpenses = expenses.filter(hasAssignedBranch);
  const confirmedPayments = branchScopedPayments.filter((payment) => payment.status === "paid");
  const incomeByMethod = methods.map((method) => ({
    method,
    amount: confirmedPayments.filter((payment) => payment.method === method).reduce((sum, payment) => sum + Number(payment.amount_paid ?? payment.amount ?? 0), 0),
  }));
  const totalIncome = incomeByMethod.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = branchScopedExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const receivables = branchScopedPayments.filter((payment) => ["pending", "credit", "partial"].includes(String(payment.status)));
  const accountsReceivable = receivables.reduce((sum, payment) => sum + Number(payment.balance_due ?? payment.amount ?? 0), 0);
  const courtesyAmount = branchScopedPayments.filter((payment) => payment.status === "courtesy").reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl bg-zinc-950 p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffcc00]">Administración</p><h2 className="text-2xl font-black">Caja</h2><p className="mt-1 text-sm text-zinc-400">Ingresos, gastos, créditos, cortesías y cobros por sede.</p></div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button onClick={onNewIncome} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffcc00] px-4 py-3 text-sm font-black text-zinc-950 shadow-lg shadow-yellow-500/20"><Plus className="h-4 w-4" />Registrar ingreso</button>
          <button onClick={onNewExpense} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-950"><Plus className="h-4 w-4" />Registrar gasto</button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total recaudado" value={money(totalIncome)} yellow />
        <MetricCard title="Gastos registrados" value={money(totalExpenses)} />
        <MetricCard title="Cuentas por cobrar" value={money(accountsReceivable)} />
        <MetricCard title="Cortesías" value={money(courtesyAmount)} />
      </div>
      <div className="grid gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><span>Filtrar por sede</span><SearchableSelect value={branchFilter} onChange={onBranchFilterChange} options={branchOptions(branches)} emptyOption={{ value: "", label: "Todas mis sedes" }} className={fieldClass()} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {incomeByMethod.map((item) => <MetricCard key={item.method} title={cellTranslations.method[item.method]} value={money(item.amount)} />)}
      </div>
      <DataTable title="Cuentas por cobrar" rows={receivables} columns={["receipt_number", "payer_name", "amount", "amount_paid", "balance_due", "due_on", "status", "branch_name"]} action={(row) => Number(row.balance_due ?? 0) > 0 ? <button type="button" onClick={() => onCollectPayment(row)} className="rounded-xl bg-[#ffcc00] px-3 py-2 text-xs font-black text-zinc-950">Cobrar</button> : null} />
      <DataTable title="Movimientos de caja" rows={movements} columns={["movement_type", "concept", "member_name", "amount", "balance_due", "method", "movement_date", "status", "branch_name"]} action={(row) => ["pending", "credit", "partial"].includes(String(row.status)) && Number(row.balance_due ?? 0) > 0 ? <button type="button" onClick={() => onCollectPayment(row)} className="rounded-xl bg-[#ffcc00] px-3 py-2 text-xs font-black text-zinc-950">Cobrar</button> : null} />
    </div>
  );
}

function ClassesModule({ subscriptions, viewMode, onViewModeChange, onNewSubscription, onEdit, onDetail, onDelete }: { subscriptions: AnyRow[]; viewMode: ClassViewMode; onViewModeChange: (mode: ClassViewMode) => void; onNewSubscription: () => void; onEdit: (row: AnyRow) => void; onDetail: (row: AnyRow) => void; onDelete: (row: AnyRow) => void }) {
  const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const [statusFilter, setStatusFilter] = useState("active");
  const filteredSubscriptions = statusFilter === "all" ? subscriptions : subscriptions.filter((item) => item.status === statusFilter);
  const activeSubscriptions = subscriptions.filter((item) => item.status === "active");
  const scheduleItems = subscriptionScheduleItems(activeSubscriptions);
  const monthDays = buildMonthDays(new Date());

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 xl:max-w-xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffcc00]">Calendario inteligente</p>
            <h2 className="text-3xl font-black">Clases y mensualidades</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">Controla alumnos por mensualidad, disciplina, días y rangos horarios.</p>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-center">
            {(["mes", "semana", "tabla"] as const).map((mode) => <button key={mode} onClick={() => onViewModeChange(mode)} className={`rounded-2xl px-4 py-2 text-sm font-black ${viewMode === mode ? "bg-[#ffcc00] text-zinc-950" : "bg-white/10 text-zinc-300 hover:bg-white/15"}`}>{mode === "mes" ? "Calendario mensual" : mode === "semana" ? "Semana" : "Tabla"}</button>)}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={onNewSubscription} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#ffcc00] px-4 py-3 text-sm font-black text-zinc-950"><Plus className="h-4 w-4" />Nueva mensualidad</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-5 sm:grid-cols-4">
          <MetricCard title="Mensualidades activas" value={activeSubscriptions.length} yellow />
          <MetricCard title="Disciplinas" value={new Set(activeSubscriptions.map((item) => item.discipline)).size} />
          <MetricCard title="Sesiones semanales" value={activeSubscriptions.reduce((sum, item) => sum + Number(item.sessions_per_week || 0), 0)} />
          <MetricCard title="MMA/Sparring" value={activeSubscriptions.filter((item) => String(item.discipline).toLowerCase().includes("mma") || String(item.discipline).toLowerCase().includes("sparring")).length} />
        </div>
      </div>

      {viewMode === "mes" ? (
        <div className={cardClass()}>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div><h3 className="text-xl font-black">Calendario mensual</h3><p className="text-sm font-semibold text-zinc-500">Cada mensualidad aparece según los días contratados por el alumno.</p></div>
            <span className="rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-black text-zinc-950">{new Date().toLocaleDateString("es-PE", { month: "long", year: "numeric" })}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {monthDays.map((day) => {
              const dayItems = scheduleItems.filter((item) => item.weekday === day.weekday);
              return <div key={day.iso} className={`min-h-36 rounded-2xl border p-3 ${day.isToday ? "border-[#ffcc00] bg-yellow-50" : "border-zinc-200 bg-zinc-50"}`}><div className="mb-2 flex items-center justify-between"><span className="text-xs font-black uppercase text-zinc-500">{day.weekdayShort}</span><span className="text-lg font-black">{day.day}</span></div><div className="space-y-2">{dayItems.slice(0, 4).map((item) => <button key={item.id} onClick={() => onDetail(item.source)} className="block w-full rounded-xl border border-white bg-white p-2 text-left shadow-sm"><span className="block truncate text-xs font-black text-zinc-950">{String(item.starts_at).slice(0, 5)} · {item.member_name}</span><span className="block truncate text-[11px] text-zinc-500">{item.discipline} · {String(item.ends_at).slice(0, 5)}</span></button>)}</div></div>;
            })}
          </div>
        </div>
      ) : null}

      {viewMode === "semana" ? <WeeklySchedule classes={scheduleItems} weekdays={weekdays} onEdit={(item) => onEdit(item.source ?? item)} /> : null}


      {viewMode === "tabla" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div><h3 className="text-lg font-black">Filtro de mensualidades</h3><p className="text-sm font-semibold text-zinc-500">Por defecto se muestran solo las activas.</p></div>
            <SearchableSelect value={statusFilter} onChange={setStatusFilter} options={trainingStatusFilterOptions} className={fieldClass("min-w-48")} />
          </div>
          <DataTable title="Mensualidades de entrenamiento" rows={filteredSubscriptions} columns={["member_name", "discipline", "monthly_fee", "starts_on", "ends_on", "selected_days", "day_schedules", "payment_method", "status"]} action={(row) => <ActionButtons onDetail={() => onDetail(row)} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />} />
        </div>
      ) : null}
    </div>
  );
}

function WeeklySchedule({ classes, weekdays, onEdit }: { classes: AnyRow[]; weekdays: string[]; onEdit: (row: AnyRow) => void }) {
  const height = (weeklyEndHour - weeklyStartHour) * weeklyHourHeight;

  return (
    <div className={cardClass()}>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-xl font-black">Calendario semanal por hora</h3>
          <p className="text-sm font-semibold text-zinc-500">Vista de lunes a domingo, desde las 7:00 a. m. hasta las 10:00 p. m.</p>
        </div>
        <span className="rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-black text-zinc-950">7:00 AM - 10:00 PM</span>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-zinc-200 bg-white">
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[78px_repeat(7,minmax(145px,1fr))] border-b border-zinc-200 bg-zinc-50">
            <div className="px-3 py-3 text-xs font-black uppercase tracking-wide text-zinc-400">Hora</div>
            {weekdays.map((day) => {
              const total = classes.filter((item) => item.weekday === day).length;
              return <div key={day} className="border-l border-zinc-200 px-3 py-3"><p className="font-black">{day}</p><p className="text-xs font-bold text-zinc-500">{total} alumnos</p></div>;
            })}
          </div>
          <div className="grid grid-cols-[78px_repeat(7,minmax(145px,1fr))]">
            <div className="relative bg-zinc-50" style={{ height }}>
              {Array.from({ length: weeklyEndHour - weeklyStartHour + 1 }, (_, index) => weeklyStartHour + index).map((hour) => (
                <div key={hour} className="absolute left-0 right-0 -translate-y-2 px-3 text-[11px] font-black text-zinc-500" style={{ top: (hour - weeklyStartHour) * weeklyHourHeight }}>{hour.toString().padStart(2, "0")}:00</div>
              ))}
            </div>
            {weekdays.map((day) => {
              const dayClasses = classes.filter((item) => item.weekday === day).sort((a, b) => timeToMinutes(a.starts_at) - timeToMinutes(b.starts_at));
              return (
                <section key={day} className="relative border-l border-zinc-200" style={{ height }}>
                  {Array.from({ length: weeklyEndHour - weeklyStartHour + 1 }, (_, index) => <div key={index} className="absolute left-0 right-0 border-t border-zinc-100" style={{ top: index * weeklyHourHeight }} />)}
                  {dayClasses.length === 0 ? <div className="absolute inset-x-3 top-4 rounded-2xl bg-zinc-50 p-3 text-center text-xs font-black text-zinc-400">Sin clases</div> : null}
                  {dayClasses.map((gymClass, index) => (
                    <button key={gymClass.id} type="button" onClick={() => onEdit(gymClass)} className="absolute overflow-hidden rounded-2xl border-l-4 bg-white p-2 text-left shadow-[0_10px_24px_rgba(0,0,0,0.10)] ring-1 ring-zinc-200 transition hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ffcc00]" style={weeklyClassStyle(gymClass, index)}>
                      <div className="flex h-full flex-col">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-zinc-500">{String(gymClass.starts_at).slice(0, 5)} - {String(gymClass.ends_at).slice(0, 5)}</p>
                          <p className="line-clamp-2 text-sm font-black leading-tight text-zinc-950">{gymClass.name}</p>
                          <p className="truncate text-[11px] font-bold text-zinc-500">{gymClass.category} · {gymClass.level}</p>
                          <p className="truncate text-[11px] text-zinc-500">{gymClass.room ?? "Horario"} · {gymClass.trainer_name ?? "Mensual"}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButtons({ onEdit, onDelete, onDetail, extra }: { onEdit: () => void; onDelete: () => void; onDetail?: () => void; extra?: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{extra}{onDetail ? <IconButton title="Ver detalles" onClick={onDetail} className="bg-white text-zinc-950 ring-1 ring-zinc-200"><Eye className="h-4 w-4" /></IconButton> : null}<IconButton title="Editar" onClick={onEdit} className="bg-zinc-950 text-white"><Edit3 className="h-4 w-4" /></IconButton><IconButton title="Eliminar" onClick={onDelete} className="bg-red-50 text-red-700 ring-1 ring-red-100"><Trash2 className="h-4 w-4" /></IconButton></div>;
}

function IconButton({ title, onClick, className, children }: { title: string; onClick: () => void; className: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      <button type="button" aria-label={title} title={title} onClick={onClick} className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-bold transition hover:-translate-y-0.5 ${className}`}>
        {children}
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-950 px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100">{title}</span>
    </span>
  );
}

function DataTable({ title, rows, columns, action }: { title: string; rows: AnyRow[]; columns: string[]; action?: (row: AnyRow) => ReactNode }) {
  return (
    <div className={cardClass()}>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="min-w-0 truncate text-lg font-black">{title}</h2><span className="shrink-0 rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-black text-zinc-950">{rows.length} registros</span></div>
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">No hay registros para mostrar.</p> : null}
        {rows.map((row) => <article key={row.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="grid gap-2">{columns.slice(0, 6).map((column) => <div key={column} className="flex items-start justify-between gap-3 border-b border-zinc-200/70 pb-2 last:border-0 last:pb-0"><span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">{labels[column] ?? column}</span><span className="max-w-[55%] text-right text-sm font-semibold text-zinc-900">{formatCell(column, row[column])}</span></div>)}</div>{action ? <div className="mt-4 flex justify-end">{action(row)}</div> : null}</article>)}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-100 md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">{columns.map((column) => <th key={column} className="px-3 py-3">{labels[column] ?? column}</th>)}{action ? <th className="px-3 py-3 text-right">Acciones</th> : null}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70">{columns.map((column) => <td key={column} className="px-3 py-3">{formatCell(column, row[column])}</td>)}{action ? <td className="px-3 py-3">{action(row)}</td> : null}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({ open, title, subtitle, children, onClose }: { open: boolean; title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-end bg-zinc-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4"><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl"><div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}</div><button onClick={onClose} className="rounded-2xl bg-zinc-100 p-2 text-zinc-600"><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

function MemberModal({ open, editing, form, branches, fitnessGoals, onCreateGoal, onChange, onSearchDni, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; branches: AnyRow[]; fitnessGoals: AnyRow[]; onCreateGoal: (name: string) => Promise<void>; onChange: (form: AnyRow) => void; onSearchDni: (dni: string) => Promise<void>; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const [newGoal, setNewGoal] = useState("");

  return (
    <Modal open={open} title={editing ? "Editar socio" : "Nuevo socio"} subtitle="Datos personales, búsqueda RENIEC y contacto de emergencia." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
            <span>DNI</span>
            <div className="flex gap-2">
              <input maxLength={8} value={form.dni ?? ""} onChange={(event) => onChange({ ...form, dni: event.target.value.replace(/\D/g, "").slice(0, 8), document_number: event.target.value.replace(/\D/g, "").slice(0, 8) })} className={fieldClass("min-w-0 flex-1")} />
              <button type="button" onClick={() => void onSearchDni(form.dni)} className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Buscar</button>
            </div>
          </label>
          {["first_name:Nombres", "last_name:Apellidos", "phone:Teléfono", "email:Correo", "birthdate:Fecha de nacimiento", "emergency_contact_name:Contacto de emergencia", "emergency_contact_phone:Teléfono emergencia"].map((item) => {
            const [field, label] = item.split(":");
            const required = ["first_name", "last_name", "phone"].includes(field);
            return <label key={field} className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel required={required}>{label}</RequiredLabel><input required={required} type={field === "birthdate" ? "date" : "text"} value={form[field] ?? ""} onChange={(event) => onChange({ ...form, [field]: event.target.value })} className={fieldClass()} /></label>;
          })}
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Sede</RequiredLabel><SearchableSelect required value={String(form.branch_id ?? "")} onChange={(value) => onChange({ ...form, branch_id: value })} options={branchOptions(branches)} className={fieldClass()} /></label>
          {editing ? <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Estado</RequiredLabel><SearchableSelect required value={form.status ?? "active"} onChange={(value) => onChange({ ...form, status: value })} options={memberRecordStatusOptions} className={fieldClass()} /></label> : null}
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Objetivo físico<SearchableSelect value={form.fitness_goal ?? ""} onChange={(value) => onChange({ ...form, fitness_goal: value })} options={fitnessGoalOptions(fitnessGoals)} emptyOption={{ value: "", label: "Sin objetivo seleccionado" }} className={fieldClass()} /></label>
        <div className="rounded-2xl bg-zinc-50 p-3">
          <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Gestionar objetivo físico</p>
          <div className="mt-2 flex gap-2">
            <input value={newGoal} onChange={(event) => setNewGoal(event.target.value)} placeholder="Ej. Aumentar fuerza" className={fieldClass("min-w-0 flex-1")} />
            <button type="button" onClick={() => void onCreateGoal(newGoal).then(() => setNewGoal(""))} className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Agregar</button>
          </div>
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Observaciones médicas<textarea value={form.medical_notes ?? ""} onChange={(event) => onChange({ ...form, medical_notes: event.target.value })} className={fieldClass("min-h-24")} /></label>
        <FormActions onClose={onClose} submitLabel={editing ? "Guardar cambios" : "Crear socio"} />
      </form>
    </Modal>
  );
}

function PlanModal({ open, editing, form, onChange, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <Modal open={open} title={editing ? "Editar plan" : "Nuevo plan"} subtitle="Configura precio, vigencia, acceso y beneficios." onClose={onClose}><form onSubmit={onSubmit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Nombre" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required /><Field label="Código" value={form.code} onChange={(value) => onChange({ ...form, code: value })} required /><Field label="Precio" type="number" value={form.price} onChange={(value) => onChange({ ...form, price: value })} required /><Field label="Duración en días" type="number" value={form.duration_days} onChange={(value) => onChange({ ...form, duration_days: value })} required /><Field label="Días de gracia" type="number" value={form.grace_days} onChange={(value) => onChange({ ...form, grace_days: value })} required /><Field label="Accesos diarios" type="number" value={form.daily_access_limit} onChange={(value) => onChange({ ...form, daily_access_limit: value })} /></div><div className="grid gap-3 rounded-2xl bg-zinc-50 p-4 text-sm font-bold"><label className="flex items-center gap-2"><input type="checkbox" checked={form.includes_classes} onChange={(event) => onChange({ ...form, includes_classes: event.target.checked })} /> Incluye clases grupales</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.includes_trainer} onChange={(event) => onChange({ ...form, includes_trainer: event.target.checked })} /> Incluye entrenador</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} /> Activo para ventas</label></div><label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Descripción<textarea value={form.description ?? ""} onChange={(event) => onChange({ ...form, description: event.target.value })} className={fieldClass("min-h-24")} /></label><FormActions onClose={onClose} submitLabel={editing ? "Guardar cambios" : "Crear plan"} /></form></Modal>;
}

function SaleModal({ open, form, members, plans, onChange, onClose, onSubmit }: { open: boolean; form: AnyRow; members: AnyRow[]; plans: AnyRow[]; onChange: (form: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <Modal open={open} title="Nueva venta" subtitle="Activa una membresía y registra el pago." onClose={onClose}><form onSubmit={onSubmit} className="space-y-3"><label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Socio</RequiredLabel><SearchableSelect required value={String(form.member_id ?? "")} onChange={(value) => onChange({ ...form, member_id: value })} options={memberOptions(members)} emptyOption={{ value: "", label: "Seleccione socio" }} className={fieldClass("w-full")} /></label><label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Plan</RequiredLabel><SearchableSelect required value={String(form.plan_id ?? "")} onChange={(value) => onChange({ ...form, plan_id: value })} options={planOptions(plans, money)} emptyOption={{ value: "", label: "Seleccione plan" }} className={fieldClass("w-full")} /></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Fecha de inicio" type="date" value={form.starts_on} onChange={(value) => onChange({ ...form, starts_on: value })} required /><Field label="Descuento" value={form.discount} onChange={(value) => onChange({ ...form, discount: value })} /></div><label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Estado del pago<SearchableSelect value={form.status ?? "paid"} onChange={(value) => onChange({ ...form, status: value })} options={paymentStatusOptions} className={fieldClass("w-full")} /></label>{form.status === "credit" ? <Field label="Vence el" type="date" value={form.due_on ?? ""} onChange={(value) => onChange({ ...form, due_on: value })} /> : null}<PaymentFields method={form.method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} /><FormActions onClose={onClose} submitLabel="Cobrar y activar" /></form></Modal>;
}

function MemberMembershipModal({ open, member, rows, saleForm, plans, onSaleChange, onClose, onSubmit }: { open: boolean; member: AnyRow | null; rows: AnyRow[]; saleForm: AnyRow; plans: AnyRow[]; onSaleChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title="Membresías del socio" subtitle={member ? `${member.first_name} ${member.last_name} · DNI ${member.dni ?? member.document_number}` : "Historial y nueva venta"} onClose={onClose}>
      <div className="space-y-5">
        <DataTable title="Historial de membresías" rows={rows} columns={["plan_name", "starts_on", "ends_on", "price", "discount", "status"]} />
        <form onSubmit={onSubmit} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-lg font-black">Activar nueva membresía</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
              <RequiredLabel>Plan</RequiredLabel>
              <SearchableSelect required value={String(saleForm.plan_id ?? "")} onChange={(value) => onSaleChange({ ...saleForm, plan_id: value })} options={planOptions(plans, money)} emptyOption={{ value: "", label: "Seleccione plan" }} className={fieldClass("w-full")} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha de inicio" type="date" value={saleForm.starts_on} onChange={(value) => onSaleChange({ ...saleForm, starts_on: value })} required />
              <Field label="Descuento" value={saleForm.discount} onChange={(value) => onSaleChange({ ...saleForm, discount: value })} />
            </div>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Estado del pago<SearchableSelect value={saleForm.status ?? "paid"} onChange={(value) => onSaleChange({ ...saleForm, status: value })} options={paymentStatusOptions} className={fieldClass("w-full")} /></label>
            {saleForm.status === "credit" ? <Field label="Vence el" type="date" value={saleForm.due_on ?? ""} onChange={(value) => onSaleChange({ ...saleForm, due_on: value })} /> : null}
            <PaymentFields method={saleForm.method ?? "cash"} file={saleForm.proof_photo} onMethodChange={(value) => onSaleChange({ ...saleForm, method: value, proof_photo: value === "cash" ? null : saleForm.proof_photo })} onFileChange={(file) => onSaleChange({ ...saleForm, proof_photo: file })} />
          </div>
          <FormActions onClose={onClose} submitLabel="Activar membresía" />
        </form>
      </div>
    </Modal>
  );
}

function IncomeModal({ open, form, branches, onChange, onClose, onSubmit }: { open: boolean; form: AnyRow; branches: AnyRow[]; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title="Registrar ingreso externo" subtitle={`Suma dinero a caja · ${branches.length} sede(s) disponibles`} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          <RequiredLabel>Categoría</RequiredLabel>
          <SearchableSelect required value={form.category} onChange={(value) => onChange({ ...form, category: value })} options={categoryOptions(incomeCategories)} className={fieldClass("w-full")} />
        </label>
        <Field label="Concepto" value={form.concept} onChange={(value) => onChange({ ...form, concept: value })} required />
        <Field label="Recibido de" value={form.payer_name} onChange={(value) => onChange({ ...form, payer_name: value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monto" type="number" value={form.amount} onChange={(value) => onChange({ ...form, amount: value })} required />
          <Field label="Fecha" type="date" value={form.paid_on} onChange={(value) => onChange({ ...form, paid_on: value })} required />
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Estado
          <SearchableSelect value={form.status ?? "paid"} onChange={(value) => onChange({ ...form, status: value })} options={paymentStatusOptions} className={fieldClass("w-full")} />
        </label>
        <PaymentFields method={form.method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} />
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Notas<textarea value={form.notes ?? ""} onChange={(event) => onChange({ ...form, notes: event.target.value })} className={fieldClass("min-h-24")} /></label>
        <FormActions onClose={onClose} submitLabel="Guardar ingreso" />
      </form>
    </Modal>
  );
}

function ExpenseModal({ open, form, onChange, onClose, onSubmit }: { open: boolean; form: AnyRow; onChange: (form: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title="Registrar gasto" subtitle="Controla egresos operativos del gimnasio." onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          <RequiredLabel>Categoría</RequiredLabel>
          <SearchableSelect required value={form.category} onChange={(value) => onChange({ ...form, category: value })} options={categoryOptions(expenseCategories)} className={fieldClass("w-full")} />
        </label>
        <Field label="Descripción" value={form.description} onChange={(value) => onChange({ ...form, description: value })} required />
        <Field label="Proveedor" value={form.supplier} onChange={(value) => onChange({ ...form, supplier: value })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monto" type="number" value={form.amount} onChange={(value) => onChange({ ...form, amount: value })} required />
          <Field label="Fecha" type="date" value={form.spent_on} onChange={(value) => onChange({ ...form, spent_on: value })} required />
        </div>
        <PaymentFields method={form.payment_method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, payment_method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} />
        <FormActions onClose={onClose} submitLabel="Guardar gasto" />
      </form>
    </Modal>
  );
}

function ProductModal({ open, editing, form, branches, onChange, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; branches: AnyRow[]; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title={editing ? "Editar producto" : "Nuevo producto"} subtitle="Administra inventario y precios por sede." onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código" value={form.code} onChange={(value) => onChange({ ...form, code: value })} required />
          <Field label="Nombre" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required />
          <Field label="Costo unitario" type="number" value={form.unit_cost} onChange={(value) => onChange({ ...form, unit_cost: value })} required />
          <Field label="Precio unitario" type="number" value={form.unit_price} onChange={(value) => onChange({ ...form, unit_price: value })} required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Stock" type="number" value={form.stock} onChange={(value) => onChange({ ...form, stock: value })} required />
          <Field label="Stock mínimo" type="number" value={form.min_stock} onChange={(value) => onChange({ ...form, min_stock: value })} />
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Sede
          <SearchableSelect value={String(form.branch_id ?? "")} onChange={(value) => onChange({ ...form, branch_id: value })} options={branchOptions(branches)} emptyOption={{ value: "", label: "Sin sede específica" }} className={fieldClass("w-full")} />
        </label>
        <label className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-4 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} /> Activar producto</label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Descripción<textarea value={form.description ?? ""} onChange={(event) => onChange({ ...form, description: event.target.value })} className={fieldClass("min-h-24")} /></label>
        <FormActions onClose={onClose} submitLabel={editing ? "Actualizar producto" : "Registrar producto"} />
      </form>
    </Modal>
  );
}

function ProductSaleModal({ open, form, products, members, onChange, onClose, onSubmit }: { open: boolean; form: AnyRow; products: AnyRow[]; members: AnyRow[]; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title="Vender producto" subtitle="Registra la venta de un producto y actualiza stock." onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Producto
          <SearchableSelect required value={String(form.product_id ?? "")} onChange={(value) => onChange({ ...form, product_id: value })} options={productOptions(products, money)} emptyOption={{ value: "", label: "Seleccione producto" }} className={fieldClass("w-full")} />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Socio
          <SearchableSelect value={String(form.member_id ?? "")} onChange={(value) => onChange({ ...form, member_id: value })} options={memberOptions(members, true)} emptyOption={{ value: "", label: "Consumidor final" }} className={fieldClass("w-full")} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cantidad" type="number" value={form.quantity} onChange={(value) => onChange({ ...form, quantity: value })} required />
          <Field label="Precio unitario" type="number" value={form.unit_price} onChange={(value) => onChange({ ...form, unit_price: value })} required />
        </div>
        <Field label="Fecha" type="date" value={form.sale_date} onChange={(value) => onChange({ ...form, sale_date: value })} required />
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Estado del pago<SearchableSelect value={form.payment_status ?? "paid"} onChange={(value) => onChange({ ...form, payment_status: value })} options={productPaymentStatusOptions} className={fieldClass("w-full")} /></label>
        {form.payment_status === "credit" ? <Field label="Vence el" type="date" value={form.due_on ?? ""} onChange={(value) => onChange({ ...form, due_on: value })} /> : null}
        <PaymentFields method={form.payment_method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, payment_method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} />
        <Field label="Notas" value={form.notes ?? ""} onChange={(value) => onChange({ ...form, notes: value })} />
        <FormActions onClose={onClose} submitLabel="Registrar venta" />
      </form>
    </Modal>
  );
}

function CollectPaymentModal({ open, payment, form, onChange, onClose, onSubmit }: { open: boolean; payment: AnyRow | null; form: AnyRow; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title="Registrar cobro" subtitle={payment ? `${payment.receipt_number ?? "Pago"} · Saldo ${money(payment.balance_due ?? payment.amount)}` : "Cobro de cuenta pendiente"} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Monto a cobrar" type="number" value={form.amount} onChange={(value) => onChange({ ...form, amount: value })} required />
        <Field label="Fecha de cobro" type="date" value={form.paid_on} onChange={(value) => onChange({ ...form, paid_on: value })} required />
        <PaymentFields method={form.method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} />
        <Field label="Notas" value={form.notes ?? ""} onChange={(value) => onChange({ ...form, notes: value })} />
        <FormActions onClose={onClose} submitLabel="Confirmar cobro" />
      </form>
    </Modal>
  );
}

function StockPurchaseModal({ open, product, form, onChange, onClose, onSubmit }: { open: boolean; product: AnyRow | null; form: AnyRow; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title="Ingreso de mercadería" subtitle={product ? `Compra de stock para ${product.name}` : "Registrar compra"} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cantidad" type="number" value={form.quantity} onChange={(value) => onChange({ ...form, quantity: value })} required />
          <Field label="Costo unitario" type="number" value={form.unit_cost} onChange={(value) => onChange({ ...form, unit_cost: value })} required />
        </div>
        <Field label="Fecha" type="date" value={form.purchased_on} onChange={(value) => onChange({ ...form, purchased_on: value })} />
        <Field label="Notas" value={form.notes ?? ""} onChange={(value) => onChange({ ...form, notes: value })} />
        <FormActions onClose={onClose} submitLabel="Registrar ingreso" />
      </form>
    </Modal>
  );
}

function ProductKardexModal({ open, rows, onClose }: { open: boolean; rows: AnyRow[]; onClose: () => void }) {
  return (
    <Modal open={open} title="Kardex de producto" subtitle="Historial de movimientos de inventario por producto." onClose={onClose}>
      <DataTable title="Movimientos" rows={rows} columns={["movement_type", "concept", "quantity", "unit_price", "branch_name", "created_at"]} />
    </Modal>
  );
}

function EquipmentModal({ open, editing, form, branches, onChange, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; branches: AnyRow[]; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title={editing ? "Editar equipo" : "Nuevo equipo"} subtitle="Controla inventario, estado operativo y próximas fechas de mantenimiento." onClose={onClose}>
      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required />
          <Field label="Código" value={form.code} onChange={(value) => onChange({ ...form, code: value })} required />
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Sede
          <SearchableSelect value={String(form.branch_id ?? "")} onChange={(value) => onChange({ ...form, branch_id: value })} options={branchOptions(branches)} emptyOption={{ value: "", label: "Sin sede específica" }} className={fieldClass("w-full")} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha de compra" type="date" value={form.purchased_on} onChange={(value) => onChange({ ...form, purchased_on: value })} />
          <Field label="Próximo mantenimiento" type="date" value={form.next_maintenance_on} onChange={(value) => onChange({ ...form, next_maintenance_on: value })} />
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          <RequiredLabel>Estado</RequiredLabel>
          <SearchableSelect required value={form.status ?? "operational"} onChange={(value) => onChange({ ...form, status: value })} options={equipmentStatusOptions} className={fieldClass("w-full")} />
        </label>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Notas<textarea value={form.notes ?? ""} onChange={(event) => onChange({ ...form, notes: event.target.value })} className={fieldClass("min-h-24")} /></label>
        <FormActions onClose={onClose} submitLabel={editing ? "Guardar cambios" : "Registrar equipo"} />
      </form>
    </Modal>
  );
}

function ClassModal({ open, editing, form, branches, onChange, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; branches: AnyRow[]; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title={editing ? "Editar clase" : "Nueva clase"} subtitle="Programa clases recurrentes por día, nivel, sala y cupos." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required />
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Disciplina</RequiredLabel><SearchableSelect required value={form.category} onChange={(value) => onChange({ ...form, category: value })} options={stringOptions(classDisciplines)} className={fieldClass()} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Nivel</RequiredLabel><SearchableSelect required value={form.level} onChange={(value) => onChange({ ...form, level: value })} options={classLevelOptions} className={fieldClass()} /></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Día</RequiredLabel><SearchableSelect required value={form.weekday} onChange={(value) => onChange({ ...form, weekday: value })} options={weekdayOptions} className={fieldClass()} /></label>
          <Field label="Hora inicio" type="time" value={form.starts_at} onChange={(value) => onChange({ ...form, starts_at: value })} required />
          <Field label="Hora fin" type="time" value={form.ends_at} onChange={(value) => onChange({ ...form, ends_at: value })} required />
          <Field label="Cupos" type="number" value={form.capacity} onChange={(value) => onChange({ ...form, capacity: value })} required />
          <Field label="Sala / ambiente" value={form.room} onChange={(value) => onChange({ ...form, room: value })} />
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Sede<SearchableSelect value={String(form.branch_id ?? "")} onChange={(value) => onChange({ ...form, branch_id: value })} options={branchOptions(branches)} emptyOption={{ value: "", label: "Sin sede" }} className={fieldClass()} /></label>
          <Field label="Color" type="color" value={form.color} onChange={(value) => onChange({ ...form, color: value })} required />
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Descripción<textarea value={form.description ?? ""} onChange={(event) => onChange({ ...form, description: event.target.value })} className={fieldClass("min-h-24")} /></label>
        <label className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-4 text-sm font-bold"><input type="checkbox" checked={form.is_active} onChange={(event) => onChange({ ...form, is_active: event.target.checked })} /> Clase activa en calendario</label>
        <FormActions onClose={onClose} submitLabel={editing ? "Guardar clase" : "Crear clase"} />
      </form>
    </Modal>
  );
}

function SystemAdminPanel({ data, reload }: { data: AnyRow; reload: () => Promise<void> }) {
  const tenants: AnyRow[] = data.tenants ?? [];
  const modules: AnyRow[] = data.modules ?? [];
  const roles: AnyRow[] = data.roles ?? [];
  const branches: AnyRow[] = data.branches ?? [];
  const adminRole = roles.find((role) => role.slug === "admin");
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const emptyTenant: AnyRow = { name: "", slug: "", contact_name: "", contact_email: "", contact_phone: "", plan_name: "Profesional", billing_status: "active", primary_color: "#ffcc00", notes: "", is_active: true };
  const emptyBranch: AnyRow = { tenant_id: "", name: "", phone: "", email: "", address: "", city: "Lima", opening_hours: "", capacity: "120", is_active: true };
  const emptyUser: AnyRow = { name: "", email: "", password: "GymPro2026!", tenant_id: "", branch_id: "", role_id: adminRole?.id ?? "", is_superadmin: false, is_active: true, phone: "" };

  const [tenantForm, setTenantForm] = useState<AnyRow>(emptyTenant);
  const [branchForm, setBranchForm] = useState<AnyRow>(emptyBranch);
  const [userForm, setUserForm] = useState<AnyRow>(emptyUser);
  const [tenantSearch, setTenantSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [tenantPage, setTenantPage] = useState(1);
  const [branchPage, setBranchPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    if (adminRole?.id && !userForm.role_id) {
      setUserForm((current) => ({ ...current, role_id: adminRole.id }));
    }
  }, [adminRole?.id, userForm.role_id]);

  function resetTenantForm() {
    setEditingTenantId(null);
    setTenantForm(emptyTenant);
  }

  function resetBranchForm() {
    setEditingBranchId(null);
    setBranchForm(emptyBranch);
  }

  function resetUserForm() {
    setEditingUserId(null);
    setUserForm({ ...emptyUser, role_id: adminRole?.id ?? "" });
  }

  function openEditTenant(tenant: AnyRow) {
    setEditingTenantId(tenant.id);
    setTenantForm({ ...emptyTenant, ...tenant });
  }

  function openEditBranch(branch: AnyRow) {
    setEditingBranchId(branch.id);
    setBranchForm({ ...emptyBranch, ...branch });
  }

  function openEditUser(user: AnyRow) {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name ?? "",
      email: user.email ?? "",
      password: "",
      tenant_id: user.tenant_id ? String(user.tenant_id) : "",
      branch_id: user.branch_id ? String(user.branch_id) : "",
      role_id: user.role_id ? String(user.role_id) : adminRole?.id ?? "",
      is_superadmin: Boolean(user.is_superadmin),
      is_active: Boolean(user.is_active),
      phone: user.phone ?? "",
    });
  }

  async function saveTenant(event: FormEvent) {
    event.preventDefault();
    const payload = { ...tenantForm };
    if (editingTenantId) {
      await httpClient.put(`/api/gym/saas/tenants/${editingTenantId}`, payload);
    } else {
      await httpClient.post("/api/gym/saas/tenants", payload);
    }
    resetTenantForm();
    await reload();
  }

  async function saveBranch(event: FormEvent) {
    event.preventDefault();
    const payload = { ...branchForm, capacity: Number(branchForm.capacity) };
    if (editingBranchId) {
      await httpClient.put(`/api/gym/saas/branches/${editingBranchId}`, payload);
    } else {
      await httpClient.post("/api/gym/saas/branches", payload);
    }
    resetBranchForm();
    await reload();
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    const payload: AnyRow = { ...userForm, role_id: userForm.role_id || adminRole?.id || null };
    if (editingUserId && !payload.password) {
      delete payload.password;
    }
    if (editingUserId) {
      await httpClient.put(`/api/gym/saas/users/${editingUserId}`, payload);
    } else {
      await httpClient.post("/api/gym/saas/users", payload);
    }
    resetUserForm();
    await reload();
  }

  async function toggleModule(tenant: AnyRow, module: string) {
    const enabled = new Set((tenant.modules ?? []).filter((item: AnyRow) => item.is_enabled).map((item: AnyRow) => item.module));
    if (enabled.has(module)) enabled.delete(module); else enabled.add(module);
    await httpClient.post(`/api/gym/saas/tenants/${tenant.id}/modules`, { modules: Array.from(enabled) });
    await reload();
  }

  const branchRows = branches.map((branch) => ({
    ...branch,
    tenant_name: tenants.find((tenant) => String(tenant.id) === String(branch.tenant_id))?.name ?? "",
  })) as AnyRow[];

  const filteredTenants = tenants.filter((tenant) => {
    const term = tenantSearch.toLowerCase().trim();
    return term === "" || [tenant.name, tenant.slug, tenant.contact_email, tenant.contact_phone].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const filteredBranches = branchRows.filter((branch: AnyRow) => {
    const term = branchSearch.toLowerCase().trim();
    return term === "" || [branch.name, branch.tenant_name, branch.email, branch.city].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const filteredUsers = (data.users ?? []).filter((user: AnyRow) => {
    const term = userSearch.toLowerCase().trim();
    return term === "" || [user.name, user.email, user.tenant_name, user.branch_name, user.role_name].some((value) => String(value ?? "").toLowerCase().includes(term));
  });

  const displayedTenants = filteredTenants.slice((tenantPage - 1) * pageSize, tenantPage * pageSize);
  const displayedBranches = filteredBranches.slice((branchPage - 1) * pageSize, branchPage * pageSize);
  const displayedUsers = filteredUsers.slice((userPage - 1) * pageSize, userPage * pageSize);

  const tenantPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const branchPages = Math.max(1, Math.ceil(filteredBranches.length / pageSize));
  const userPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));

  return (
    <Module title="Sistema SaaS" subtitle="Clientes, sedes, usuarios administradores y módulos habilitados por cliente.">
      <div className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={saveTenant} className={cardClass()}>
          <h3 className="text-lg font-black">{editingTenantId ? "Editar cliente" : "Nuevo cliente"}</h3>
          <div className="mt-3 grid gap-3">
            <Field label="Nombre comercial" value={tenantForm.name} onChange={(value) => setTenantForm({ ...tenantForm, name: value, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} required />
            <Field label="Código URL" value={tenantForm.slug} onChange={(value) => setTenantForm({ ...tenantForm, slug: value })} required />
            <Field label="Contacto" value={tenantForm.contact_name} onChange={(value) => setTenantForm({ ...tenantForm, contact_name: value })} />
            <Field label="Correo" type="email" value={tenantForm.contact_email} onChange={(value) => setTenantForm({ ...tenantForm, contact_email: value })} />
            <Field label="Teléfono" value={tenantForm.contact_phone} onChange={(value) => setTenantForm({ ...tenantForm, contact_phone: value })} />
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Estado<SearchableSelect value={tenantForm.billing_status} onChange={(value) => setTenantForm({ ...tenantForm, billing_status: value })} options={tenantBillingStatusOptions} className={fieldClass()} /></label>
            <FormActions onClose={resetTenantForm} submitLabel={editingTenantId ? "Guardar cliente" : "Crear cliente"} />
          </div>
        </form>

        <form onSubmit={saveBranch} className={cardClass()}>
          <h3 className="text-lg font-black">{editingBranchId ? "Editar sede" : "Nueva sede"}</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Cliente</RequiredLabel><SearchableSelect required value={String(branchForm.tenant_id ?? "")} onChange={(value) => setBranchForm({ ...branchForm, tenant_id: value })} options={tenantOptions(tenants)} emptyOption={{ value: "", label: "Seleccione cliente" }} className={fieldClass()} /></label>
            <Field label="Nombre de sede" value={branchForm.name} onChange={(value) => setBranchForm({ ...branchForm, name: value })} required />
            <Field label="Dirección" value={branchForm.address} onChange={(value) => setBranchForm({ ...branchForm, address: value })} required />
            <Field label="Ciudad" value={branchForm.city} onChange={(value) => setBranchForm({ ...branchForm, city: value })} required />
            <Field label="Aforo" type="number" value={branchForm.capacity} onChange={(value) => setBranchForm({ ...branchForm, capacity: value })} required />
            <FormActions onClose={resetBranchForm} submitLabel={editingBranchId ? "Guardar sede" : "Crear sede"} />
          </div>
        </form>

        <form onSubmit={saveUser} className={cardClass()}>
          <h3 className="text-lg font-black">{editingUserId ? "Editar usuario" : "Usuario cliente"}</h3>
          <div className="mt-3 grid gap-3">
            <Field label="Nombre" value={userForm.name} onChange={(value) => setUserForm({ ...userForm, name: value })} required />
            <Field label="Correo" type="email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} required />
            <Field label={editingUserId ? "Clave (vacío = sin cambios)" : "Clave inicial"} value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} required={!editingUserId} />
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Cliente<SearchableSelect value={String(userForm.tenant_id ?? "")} onChange={(value) => setUserForm({ ...userForm, tenant_id: value })} options={tenantOptions(tenants)} emptyOption={{ value: "", label: "Administrador del sistema" }} className={fieldClass()} /></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Sede<SearchableSelect value={String(userForm.branch_id ?? "")} onChange={(value) => setUserForm({ ...userForm, branch_id: value })} options={branchOptions(branches.filter((branch) => !userForm.tenant_id || String(branch.tenant_id) === String(userForm.tenant_id)))} emptyOption={{ value: "", label: "Todas las sedes del cliente" }} className={fieldClass()} /></label>
            <label className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-4 text-sm font-bold"><input type="checkbox" checked={userForm.is_superadmin} onChange={(event) => setUserForm({ ...userForm, is_superadmin: event.target.checked })} /> Administrador del sistema</label>
            <FormActions onClose={resetUserForm} submitLabel={editingUserId ? "Guardar usuario" : "Crear usuario"} />
          </div>
        </form>
      </div>

      <div className={cardClass()}>
        <h3 className="mb-4 text-xl font-black">Clientes SaaS y módulos</h3>
        <div className="grid gap-4">
          {tenants.map((tenant) => {
            const enabled = new Set((tenant.modules ?? []).filter((item: AnyRow) => item.is_enabled).map((item: AnyRow) => item.module));
            return (
              <article key={tenant.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div><h4 className="text-lg font-black">{tenant.name}</h4><p className="text-sm font-semibold text-zinc-500">{tenant.branches_count} sedes · {tenant.members_count} socios · {tenant.users_count} usuarios</p></div>
                  <span className="rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-black text-zinc-950">{cellTranslations.status[tenant.billing_status] ?? tenant.billing_status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {modules.map((item) => <button key={item.module} type="button" onClick={() => void toggleModule(tenant, item.module)} className={`rounded-2xl border px-3 py-2 text-xs font-black ${enabled.has(item.module) ? "border-[#ffcc00] bg-[#ffcc00] text-zinc-950" : "border-zinc-200 bg-white text-zinc-500"}`}>{item.label}</button>)}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-4">
        <Field label="Buscar clientes" value={tenantSearch} onChange={(value) => { setTenantPage(1); setTenantSearch(value); }} />
        <Field label="Buscar sedes" value={branchSearch} onChange={(value) => { setBranchPage(1); setBranchSearch(value); }} />
        <Field label="Buscar usuarios" value={userSearch} onChange={(value) => { setUserPage(1); setUserSearch(value); }} />
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Filas por página<SearchableSelect value={String(pageSize)} onChange={(value) => { setTenantPage(1); setBranchPage(1); setUserPage(1); setPageSize(Number(value)); }} options={pageSizeOptionsLarge} className={fieldClass()} /></label>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <DataTable title="Clientes SaaS" rows={displayedTenants} columns={["name", "slug", "contact_email", "contact_phone", "plan_name", "billing_status", "is_active"]} action={(row) => <button type="button" onClick={() => openEditTenant(row)} className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Editar</button>} />
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-500">
            <span>Mostrando {displayedTenants.length} de {filteredTenants.length} clientes</span>
            <div className="flex items-center gap-2">
              <button disabled={tenantPage <= 1} onClick={() => setTenantPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">Anterior</button>
              <span>Página {tenantPage} de {tenantPages}</span>
              <button disabled={tenantPage >= tenantPages} onClick={() => setTenantPage((current) => Math.min(tenantPages, current + 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <DataTable title="Sedes SaaS" rows={displayedBranches} columns={["name", "tenant_name", "phone", "email", "city", "capacity", "is_active"]} action={(row) => <button type="button" onClick={() => openEditBranch(row)} className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Editar</button>} />
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-500">
            <span>Mostrando {displayedBranches.length} de {filteredBranches.length} sedes</span>
            <div className="flex items-center gap-2">
              <button disabled={branchPage <= 1} onClick={() => setBranchPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">Anterior</button>
              <span>Página {branchPage} de {branchPages}</span>
              <button disabled={branchPage >= branchPages} onClick={() => setBranchPage((current) => Math.min(branchPages, current + 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <DataTable title="Usuarios del sistema" rows={displayedUsers} columns={["name", "email", "tenant_name", "branch_name", "role_name", "is_superadmin", "is_active"]} action={(row) => <button type="button" onClick={() => openEditUser(row)} className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Editar</button>} />
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-500">
            <span>Mostrando {displayedUsers.length} de {filteredUsers.length} usuarios</span>
            <div className="flex items-center gap-2">
              <button disabled={userPage <= 1} onClick={() => setUserPage((current) => Math.max(1, current - 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">Anterior</button>
              <span>Página {userPage} de {userPages}</span>
              <button disabled={userPage >= userPages} onClick={() => setUserPage((current) => Math.min(userPages, current + 1))} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </Module>
  );
}

function ClassDetailModal({ open, gymClass, members, rows, bookingDate, selectedMemberId, onDateChange, onMemberChange, onReserve, onCheckIn, onCancel, onClose }: { open: boolean; gymClass: AnyRow | null; members: AnyRow[]; rows: AnyRow[]; bookingDate: string; selectedMemberId: string; onDateChange: (date: string) => void; onMemberChange: (id: string) => void; onReserve: (event: FormEvent) => void; onCheckIn: (row: AnyRow) => Promise<void>; onCancel: (row: AnyRow) => Promise<void>; onClose: () => void }) {
  return (
    <Modal open={open} title={gymClass ? gymClass.name : "Control de clase"} subtitle={gymClass ? `${gymClass.category} · ${gymClass.weekday} · ${String(gymClass.starts_at).slice(0, 5)} - ${String(gymClass.ends_at).slice(0, 5)}` : ""} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Cupos" value={gymClass?.capacity ?? 0} yellow />
          <MetricCard title="Reservas" value={rows.filter((row) => row.status !== "cancelled").length} />
          <MetricCard title="Asistieron" value={rows.filter((row) => row.status === "attended").length} dark />
        </div>
        <form onSubmit={onReserve} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
          <h3 className="text-lg font-black">Reservar socio</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
            <input type="date" value={bookingDate} onChange={(event) => onDateChange(event.target.value)} className={fieldClass()} />
            <SearchableSelect required value={selectedMemberId} onChange={onMemberChange} options={memberOptions(members)} emptyOption={{ value: "", label: "Seleccione socio" }} className={fieldClass("w-full")} />
            <button className="rounded-2xl bg-[#ffcc00] px-4 py-3 text-sm font-black text-zinc-950">Reservar</button>
          </div>
        </form>
        <DataTable title="Reservas de la fecha" rows={rows} columns={["member_name", "dni", "status", "checked_in_at", "notes"]} action={(row) => <div className="flex flex-wrap justify-end gap-2"><button onClick={() => void onCheckIn(row)} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white">Asistió</button><button onClick={() => void onCancel(row)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Cancelar</button></div>} />
      </div>
    </Modal>
  );
}

function TrainingSubscriptionDetailModal({ subscription, onClose, onEdit }: { subscription: AnyRow | null; onClose: () => void; onEdit: (subscription: AnyRow) => void }) {
  if (!subscription) return null;
  const paymentMethod = subscription.payment_method_recorded ?? subscription.payment_method;
  const schedules = subscription.day_schedules && typeof subscription.day_schedules === "object" ? Object.entries(subscription.day_schedules as Record<string, { start?: string; end?: string }>) : [];

  return (
    <Modal open title="Detalle de mensualidad" subtitle={`${subscription.member_name ?? "Socio"} · ${subscription.discipline ?? "Disciplina"}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Mensualidad" value={money(subscription.monthly_fee)} yellow />
          <MetricCard title="Sesiones/semana" value={subscription.sessions_per_week ?? 0} />
          <MetricCard title="Estado" value={<StatusBadge value={String(subscription.status ?? "active")} />} />
        </div>
        <div className="grid gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
          <DetailItem label="Socio" value={subscription.member_name} />
          <DetailItem label="DNI" value={subscription.dni} />
          <DetailItem label="Disciplina" value={subscription.discipline} />
          <DetailItem label="Vigencia" value={`${formatDateTime(subscription.starts_on)} - ${formatDateTime(subscription.ends_on)}`} />
          <DetailItem label="Días" value={Array.isArray(subscription.selected_days) ? subscription.selected_days.join(", ") : "-"} />
          <DetailItem label="Medio de pago" value={cellTranslations.payment_method[String(paymentMethod)] ?? paymentMethod} />
          <DetailItem label="Comprobante" value={subscription.payment_receipt_number ?? "Generado al registrar la mensualidad"} />
          <DetailItem label="Estado del pago" value={<StatusBadge value={String(subscription.payment_status ?? "paid")} />} />
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-500">Horarios contratados</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {schedules.length === 0 ? <p className="text-sm font-semibold text-zinc-500">Sin horarios registrados.</p> : schedules.map(([day, range]) => <div key={day} className="rounded-2xl bg-zinc-50 p-3 text-sm"><b>{day}</b><p className="font-semibold text-zinc-600">{range.start ?? "--:--"} - {range.end ?? "--:--"}</p></div>)}
          </div>
        </div>
        <div className="rounded-3xl border border-zinc-200 bg-white p-4">
          <h3 className="text-sm font-black uppercase tracking-wide text-zinc-500">Comprobante de pago</h3>
          {subscription.proof_url ? (
            <div className="mt-3 space-y-3">
              <a href={subscription.proof_url} target="_blank" rel="noreferrer" className="inline-flex rounded-2xl bg-[#ffcc00] px-4 py-2 text-sm font-black text-zinc-950">Abrir comprobante</a>
              <img src={subscription.proof_url} alt="Comprobante de pago" className="max-h-80 rounded-2xl border border-zinc-200 object-contain" />
            </div>
          ) : <p className="mt-2 text-sm font-semibold text-zinc-500">Sin foto de comprobante. En efectivo no se solicita captura.</p>}
        </div>
        {subscription.notes ? <div className="rounded-3xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-600"><b>Notas:</b> {subscription.notes}</div> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-black">Cerrar</button>
          <button type="button" onClick={() => onEdit(subscription)} className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Editar</button>
        </div>
      </div>
    </Modal>
  );
}

function MemberCredentialModal({ member, membership, onClose, onCheckIn }: { member: AnyRow | null; membership: AnyRow | null; onClose: () => void; onCheckIn: (memberId: number) => void }) {
  if (!member) return null;
  const status = membership && (daysUntil(membership.ends_on) ?? -1) >= 0 ? "active" : "expired";
  const portalCode = `${member.member_code ?? member.id}-${member.dni ?? member.document_number ?? ""}`;
  const whatsapp = whatsappUrl(member.phone, `Hola ${member.first_name}, esta es tu credencial digital del gimnasio. Código: ${portalCode}`);

  return (
    <Modal open title="Credencial digital del socio" subtitle="Tarjeta lista para validar acceso, compartir por WhatsApp y atender desde celular." onClose={onClose}>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl bg-zinc-950 text-white">
          <div className="flex items-start justify-between gap-3 p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffcc00]">Portal del miembro</p>
              <h3 className="mt-2 text-2xl font-black">{memberFullName(member)}</h3>
              <p className="text-sm text-zinc-400">DNI {member.dni ?? member.document_number ?? "-"} · {member.member_code ?? "Sin código"}</p>
            </div>
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-white text-zinc-950">
              <QrCode className="h-11 w-11" />
            </div>
          </div>
          <div className="grid gap-3 border-t border-white/10 p-5 sm:grid-cols-3">
            <MetricCard title="Estado" value={<StatusBadge value={status} />} yellow={status === "active"} />
            <MetricCard title="Vence" value={membership?.ends_on ? formatDateTime(membership.ends_on) : "Sin plan"} />
            <MetricCard title="Código QR" value={portalCode} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onCheckIn(Number(member.id))} className="rounded-2xl bg-[#ffcc00] px-5 py-3 text-sm font-black text-zinc-950">Registrar ingreso</button>
          {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white"><MessageCircle className="h-4 w-4" />Enviar por WhatsApp</a> : <button type="button" disabled className="rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-black text-zinc-400">Sin teléfono</button>}
        </div>
        <div className="rounded-3xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">
          Esta credencial prepara el flujo de portal móvil y check-in QR: el staff puede validar al socio sin buscarlo manualmente.
        </div>
      </div>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return <div><p className="text-[11px] font-black uppercase tracking-wide text-zinc-500">{label}</p><div className="mt-1 text-sm font-black text-zinc-950">{value || "-"}</div></div>;
}

function TrainingSubscriptionModal({ open, editing, form, members, onCreateMember, onChange, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; members: AnyRow[]; onCreateMember: () => void; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  const weekdays = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const selectedDays: string[] = form.selected_days ?? [];
  const maxDays = Math.max(1, Math.min(7, Number(form.sessions_per_week || 1)));
  const daySchedules: Record<string, { start: string; end: string }> = form.day_schedules ?? {};

  function toggleDay(day: string) {
    if (!selectedDays.includes(day) && selectedDays.length >= maxDays) return;
    const nextSelectedDays = selectedDays.includes(day) ? selectedDays.filter((item) => item !== day) : [...selectedDays, day];
    const nextSchedules = { ...daySchedules };
    if (nextSelectedDays.includes(day) && !nextSchedules[day]) nextSchedules[day] = { start: form.preferred_time || "19:00", end: "20:00" };
    if (!nextSelectedDays.includes(day)) delete nextSchedules[day];
    onChange({
      ...form,
      selected_days: nextSelectedDays,
      day_schedules: nextSchedules,
      preferred_time: nextSchedules[nextSelectedDays[0]]?.start ?? form.preferred_time,
    });
  }

  function updateDaySchedule(day: string, field: "start" | "end", value: string) {
    const current = daySchedules[day] ?? { start: form.preferred_time || "19:00", end: "20:00" };
    const nextSchedules = { ...daySchedules, [day]: { ...current, [field]: value } };
    onChange({ ...form, day_schedules: nextSchedules, preferred_time: nextSchedules[selectedDays[0]]?.start ?? value });
  }

  return (
    <Modal open={open} title={editing ? "Editar mensualidad" : "Mensualidad de clases"} subtitle="El socio paga mensual y define qué días y a qué hora entrena." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          <div className="flex items-center justify-between gap-3">
            <RequiredLabel>Socio</RequiredLabel>
            <button type="button" onClick={onCreateMember} className="rounded-xl bg-zinc-950 px-3 py-2 text-[11px] font-black normal-case tracking-normal text-white">Crear socio</button>
          </div>
          <SearchableSelect required value={String(form.member_id ?? "")} onChange={(value) => onChange({ ...form, member_id: value })} options={memberOptions(members)} emptyOption={{ value: "", label: "Seleccione socio" }} className={fieldClass()} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Disciplina</RequiredLabel><SearchableSelect required value={form.discipline} onChange={(value) => onChange({ ...form, discipline: value })} options={stringOptions(classDisciplines)} className={fieldClass()} /></label>
          <Field label="Mensualidad" type="number" value={form.monthly_fee} onChange={(value) => onChange({ ...form, monthly_fee: value })} required />
          <Field label="Inicio" type="date" value={form.starts_on} onChange={(value) => onChange({ ...form, starts_on: value })} required />
          <Field label="Sesiones por semana" type="number" value={form.sessions_per_week} onChange={(value) => {
            const limit = Math.max(1, Math.min(7, Number(value || 1)));
            const trimmedDays = selectedDays.slice(0, limit);
            const trimmedSchedules = Object.fromEntries(Object.entries(daySchedules).filter(([day]) => trimmedDays.includes(day)));
            onChange({ ...form, sessions_per_week: value, selected_days: trimmedDays, day_schedules: trimmedSchedules });
          }} required />
        </div>
        <div>
          <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-zinc-500">Días de entrenamiento <span className="text-red-600">*</span></p>
            <span className={`text-xs font-black ${selectedDays.length === maxDays ? "text-emerald-700" : "text-zinc-500"}`}>{selectedDays.length}/{maxDays} días seleccionados</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {weekdays.map((day) => {
              const isSelected = selectedDays.includes(day);
              const isDisabled = !isSelected && selectedDays.length >= maxDays;
              return <button key={day} type="button" disabled={isDisabled} onClick={() => toggleDay(day)} className={`rounded-2xl border px-3 py-2 text-sm font-black ${isSelected ? "border-[#ffcc00] bg-[#ffcc00] text-zinc-950" : isDisabled ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300" : "border-zinc-200 bg-white text-zinc-600"}`}>{day}</button>;
            })}
          </div>
          {selectedDays.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {selectedDays.map((day) => {
                const schedule = daySchedules[day] ?? { start: form.preferred_time || "19:00", end: "20:00" };
                return (
                  <div key={day} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="mb-2 text-sm font-black text-zinc-800">{day}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Field label="Desde" type="time" value={schedule.start} onChange={(value) => updateDaySchedule(day, "start", value)} required />
                      <Field label="Hasta" type="time" value={schedule.end} onChange={(value) => updateDaySchedule(day, "end", value)} required />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
        <PaymentFields method={form.payment_method ?? "cash"} file={form.proof_photo} existingProofUrl={form.proof_url} onMethodChange={(value) => onChange({ ...form, payment_method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} />
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Notas<textarea value={form.notes ?? ""} onChange={(event) => onChange({ ...form, notes: event.target.value })} className={fieldClass("min-h-24")} /></label>
        <FormActions onClose={onClose} submitLabel={editing ? "Guardar cambios" : "Registrar mensualidad"} />
      </form>
    </Modal>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel required={Boolean(required)}>{label}</RequiredLabel><input type={type} required={required} value={value ?? ""} onChange={(event) => onChange(event.target.value)} className={fieldClass()} /></label>;
}

function RequiredLabel({ children, required = true }: { children: ReactNode; required?: boolean }) {
  return <span>{children}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>;
}

function PaymentFields({ method, file, existingProofUrl, onMethodChange, onFileChange }: { method: string; file: File | null; existingProofUrl?: string; onMethodChange: (value: string) => void; onFileChange: (file: File | null) => void }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(existingProofUrl ?? "");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, existingProofUrl]);

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
        <RequiredLabel>Medio de pago</RequiredLabel>
        <SearchableSelect required value={method || "cash"} onChange={onMethodChange} options={paymentMethodOptions} className={fieldClass("w-full")} />
      </label>
      {method !== "cash" ? (
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Foto del comprobante
          <input type="file" accept="image/*" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} className={fieldClass("w-full file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white")} />
          {file ? <span className="text-xs font-semibold normal-case tracking-normal text-zinc-500">{file.name}</span> : null}
          {!file && existingProofUrl ? <a href={existingProofUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit rounded-xl bg-blue-50 px-3 py-2 text-xs font-black normal-case tracking-normal text-blue-700">Ver comprobante actual</a> : null}
          {previewUrl ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-2">
              <img src={previewUrl} alt="Previsualización del comprobante" className="max-h-64 w-full rounded-xl object-contain" />
            </div>
          ) : null}
        </label>
      ) : null}
    </div>
  );
}

function FormActions({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-black">Cancelar</button><button className="rounded-2xl bg-[#ffcc00] px-5 py-3 text-sm font-black text-zinc-950">{submitLabel}</button></div>;
}

function ConfirmModal({ state, onClose }: { state: ConfirmState; onClose: () => void }) {
  if (!state) return null;
  return <Modal open title={state.title} subtitle={state.body} onClose={onClose}><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onClose} className="rounded-2xl border border-zinc-200 px-5 py-3 text-sm font-black">Cancelar</button><button onClick={() => void state.onConfirm().finally(onClose)} className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white">Confirmar</button></div></Modal>;
}

function ErrorModal({ state, onClose, onGoToLogin }: { state: ErrorState; onClose: () => void; onGoToLogin: () => void }) {
  if (!state) return null;
  return (
    <Modal open title={state.title} subtitle={state.message} onClose={state.sessionExpired ? onGoToLogin : onClose}>
      <div className="space-y-4">
        {state.details?.length ? (
          <div className="rounded-3xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-black text-red-800">Revisa estos puntos:</p>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-red-700">
              {state.details.map((detail) => <li key={detail} className="flex gap-2"><span>•</span><span>{detail}</span></li>)}
            </ul>
          </div>
        ) : null}
        <div className="rounded-3xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">
          {state.sessionExpired
            ? "Si no haces nada, la página te llevará al inicio de sesión automáticamente."
            : "Corrige los datos indicados y vuelve a intentar. La información del formulario no se ha perdido."}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {state.sessionExpired ? (
            <button onClick={onGoToLogin} className="rounded-2xl bg-[#ffcc00] px-5 py-3 text-sm font-black text-zinc-950">Ir a iniciar sesión</button>
          ) : (
            <button onClick={onClose} className="rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Entendido</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function BottomNav({ tab, tabs, onSelect }: { tab: Tab; tabs: { id: Tab; label: string; icon: any }[]; onSelect: (tab: Tab) => void }) {
  return <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-md grid-cols-4 gap-1">{tabs.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => onSelect(item.id)} className={`rounded-2xl px-2 py-2 text-[10px] font-black ${tab === item.id ? "bg-[#ffcc00] text-zinc-950" : "text-zinc-500"}`}><Icon className="mx-auto mb-1 h-5 w-5" />{item.label}</button>; })}</div></nav>;
}
