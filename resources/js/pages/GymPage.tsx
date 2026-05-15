import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Activity, Bell, CalendarDays, CreditCard, Dumbbell, Edit3, Eye, LogOut, Menu, Plus, Search, ShieldCheck, Trash2, Users, Wrench, X } from "lucide-react";
import { httpClient } from "../http/client";
import { useAuth } from "../context/AuthContext";

type AnyRow = Record<string, any>;
type Tab = "dashboard" | "members" | "plans" | "memberships" | "attendance" | "classes" | "finance" | "equipment" | "system";
type ConfirmState = { title: string; body: string; onConfirm: () => Promise<void> } | null;
type MemberModalContext = "general" | "training";
type ClassViewMode = "mes" | "semana" | "tabla";

const classDisciplines = ["MMA", "Sparring", "Box", "Brazilian Jiu-Jitsu", "Muay Thai", "Funcional", "Cardio", "Fuerza", "Yoga"];

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Panel", icon: Activity },
  { id: "members", label: "Socios", icon: Users },
  { id: "plans", label: "Planes", icon: CreditCard },
  { id: "memberships", label: "Membresías", icon: CreditCard },
  { id: "attendance", label: "Accesos", icon: ShieldCheck },
  { id: "classes", label: "Clases", icon: CalendarDays },
  { id: "finance", label: "Caja", icon: Bell },
  { id: "equipment", label: "Equipos", icon: Wrench },
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
  paid_on: "Fecha",
  proof_url: "Foto",
  discipline: "Disciplina",
  monthly_fee: "Mensualidad",
  selected_days: "Días",
  day_schedules: "Horarios",
  preferred_time: "Hora",
  payment_method: "Pago",
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
  status: {
    active: "Activo",
    inactive: "Inactivo",
    blocked: "Bloqueado",
    paid: "Pagado",
    pending: "Pendiente",
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
  if (column.includes("amount") || column === "price" || column === "discount") return money(value);
  if (column === "duration_days") return `${value ?? 0} días`;
  if (column === "grace_days") return `${value ?? 0} días`;
  if (column === "monthly_fee") return money(value);
  if (column === "selected_days" && Array.isArray(value)) return value.join(", ");
  if (column === "day_schedules" && value && typeof value === "object") return Object.entries(value as Record<string, { start?: string; end?: string }>).map(([day, range]) => `${day}: ${range.start ?? "--:--"}-${range.end ?? "--:--"}`).join(", ");
  if (typeof value === "boolean" || value === 0 || value === 1) return Boolean(value) ? "Sí" : "No";
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
  const [memberships, setMemberships] = useState<AnyRow[]>([]);
  const [payments, setPayments] = useState<AnyRow[]>([]);
  const [attendance, setAttendance] = useState<AnyRow[]>([]);
  const [classes, setClasses] = useState<AnyRow[]>([]);
  const [trainingSubscriptions, setTrainingSubscriptions] = useState<AnyRow[]>([]);
  const [equipment, setEquipment] = useState<AnyRow[]>([]);
  const [notifications, setNotifications] = useState<AnyRow[]>([]);
  const [saas, setSaas] = useState<AnyRow>({ tenants: [], users: [], modules: [], roles: [], branches: [] });
  const [memberForm, setMemberForm] = useState<AnyRow>(emptyMember);
  const [planForm, setPlanForm] = useState<AnyRow>(emptyPlan);
  const [saleForm, setSaleForm] = useState<AnyRow>({ member_id: "", plan_id: "", starts_on: new Date().toISOString().slice(0, 10), discount: "0", method: "cash", proof_photo: null, notes: "" });
  const [expenseForm, setExpenseForm] = useState<AnyRow>({ category: "", supplier: "", amount: "", spent_on: new Date().toISOString().slice(0, 10), payment_method: "cash", proof_photo: null, description: "" });
  const [classForm, setClassForm] = useState<AnyRow>(emptyClassForm);
  const [classModalOpen, setClassModalOpen] = useState(false);
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
  const [memberModalContext, setMemberModalContext] = useState<MemberModalContext>("general");
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [memberMembershipModalOpen, setMemberMembershipModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AnyRow | null>(null);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const activeMembers = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  void classes;
  const visibleTabs = useMemo(() => {
    if (user?.is_superadmin) return tabs;
    const enabled = new Set<string>(dashboard.enabled_modules ?? tabs.filter((item) => item.id !== "system").map((item) => item.id));
    return tabs.filter((item) => item.id !== "system" && enabled.has(item.id));
  }, [dashboard.enabled_modules, user?.is_superadmin]);
  const currentTab = visibleTabs.find((item) => item.id === tab) ?? visibleTabs[0] ?? tabs[0];

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setMobileMenuOpen(false);
  }

  async function loadAll() {
    const [dash, branchRes, goalRes, planRes, memberRes, membershipRes, paymentRes, attendanceRes, classRes, trainingRes, equipmentRes, notificationRes] = await Promise.all([
      httpClient.get("/api/gym/dashboard"),
      httpClient.get("/api/gym/branches"),
      httpClient.get("/api/gym/fitness-goals"),
      httpClient.get("/api/gym/plans"),
      httpClient.get("/api/gym/members", { params: { search } }),
      httpClient.get("/api/gym/memberships"),
      httpClient.get("/api/gym/payments"),
      httpClient.get("/api/gym/attendance"),
      httpClient.get("/api/gym/classes"),
      httpClient.get("/api/gym/training-subscriptions"),
      httpClient.get("/api/gym/equipment"),
      httpClient.get("/api/gym/notifications"),
    ]);
    setDashboard(dash.data);
    setBranches(branchRes.data);
    setFitnessGoals(goalRes.data);
    setPlans(planRes.data);
    setMembers(memberRes.data);
    setMemberships(membershipRes.data);
    setPayments(paymentRes.data);
    setAttendance(attendanceRes.data);
    setClasses(classRes.data);
    setTrainingSubscriptions(trainingRes.data);
    setEquipment(equipmentRes.data);
    setNotifications(notificationRes.data);
    if (user?.is_superadmin) {
      const saasRes = await httpClient.get("/api/gym/saas");
      setSaas(saasRes.data);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

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
    setMemberForm({ ...emptyMember, ...member, branch_id: member.branch_id ? String(member.branch_id) : "" });
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

  async function sellMembership(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData();
    Object.entries(saleForm).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") formData.append(key, value as string | Blob);
    });
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
    Object.entries(expenseForm).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") formData.append(key, value as string | Blob);
    });
    await httpClient.post("/api/gym/expenses", formData);
    setExpenseForm({ category: "", supplier: "", amount: "", spent_on: new Date().toISOString().slice(0, 10), payment_method: "cash", proof_photo: null, description: "" });
    setExpenseModalOpen(false);
    setMessage("Gasto registrado.");
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
    setTrainingSubscriptionSaving(true);
    const formData = new FormData();
    try {
      Object.entries(trainingSubscriptionForm).forEach(([key, value]) => {
        if (key === "selected_days" && Array.isArray(value)) {
          value.forEach((day) => formData.append("selected_days[]", day));
        } else if (key === "day_schedules") {
          formData.append("day_schedules", JSON.stringify(value ?? {}));
        } else if (value !== null && value !== undefined && value !== "") {
          formData.append(key, value as string | Blob);
        }
      });
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
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-3 py-3 backdrop-blur-xl sm:px-4 lg:px-8 lg:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileMenuOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm lg:hidden" aria-label="Abrir menú"><Menu className="h-5 w-5" /></button>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[#d9a900] sm:text-xs sm:tracking-[0.28em]">Gestión profesional</p>
                <h1 className="truncate text-xl font-black sm:text-2xl">Control total del gimnasio</h1>
                <p className="mt-0.5 text-xs font-bold text-zinc-500 lg:hidden">{currentTab.label}</p>
              </div>
            </div>
            <div className="flex w-full items-center rounded-2xl border border-zinc-200 bg-white px-3 shadow-sm lg:ml-auto lg:min-w-[360px] lg:max-w-lg">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && loadAll()} placeholder="Buscar socio, DNI o código" className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none" />
              <button onClick={() => void loadAll()} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white">Buscar</button>
            </div>
          </div>
          {message ? <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">{message}</div> : null}
        </header>

        <section className="space-y-5 p-3 sm:p-4 lg:space-y-6 lg:p-8">
          {tab === "dashboard" ? <Dashboard dashboard={dashboard} activeMembers={activeMembers.length} memberships={memberships.length} notifications={notifications} /> : null}
          {tab === "members" ? <Module title="Socios" subtitle="Base de clientes, datos de contacto y control operativo." onNew={openNewMember} newLabel="Nuevo socio"><DataTable title="Socios registrados" rows={members} columns={["member_code", "dni", "first_name", "last_name", "phone", "status", "branch_name"]} action={(row) => <ActionButtons onEdit={() => openEditMember(row)} onDelete={() => confirmDeleteMember(row)} extra={<><button onClick={() => void checkIn(row.id)} className="rounded-xl bg-[#ffcc00] px-3 py-2 text-xs font-black text-zinc-950">Ingreso</button><button onClick={() => void openMemberMemberships(row)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Membresías</button></>} />} /></Module> : null}
          {tab === "plans" ? <Module title="Planes" subtitle="Membresías, precios, duración y beneficios comerciales." onNew={openNewPlan} newLabel="Nuevo plan"><DataTable title="Planes del gimnasio" rows={plans} columns={["code", "name", "price", "duration_days", "grace_days", "daily_access_limit", "includes_classes", "includes_trainer", "is_active"]} action={(row) => <ActionButtons onEdit={() => openEditPlan(row)} onDelete={() => confirmDeletePlan(row)} />} /></Module> : null}
          {tab === "memberships" ? <Module title="Membresías" subtitle="Ventas, renovaciones y activaciones de socios." onNew={() => setSaleModalOpen(true)} newLabel="Nueva venta"><DataTable title="Membresías activadas" rows={memberships} columns={["member_name", "plan_name", "starts_on", "ends_on", "price", "discount", "status"]} /></Module> : null}
          {tab === "attendance" ? <Module title="Accesos" subtitle="Historial de ingreso y validación de membresías."><DataTable title="Control de accesos" rows={attendance} columns={["member_name", "checked_in_at", "checked_out_at", "notes"]} /></Module> : null}
          {tab === "classes" ? <ClassesModule subscriptions={trainingSubscriptions} viewMode={classesViewMode} onViewModeChange={setClassesViewMode} onNewSubscription={openTrainingSubscription} onEdit={openEditTrainingSubscription} onDetail={openTrainingSubscriptionDetail} onDelete={confirmDeleteTrainingSubscription} /> : null}
          {tab === "equipment" ? <Module title="Equipos" subtitle="Activos, estado operativo y próximos mantenimientos."><DataTable title="Equipos y mantenimiento" rows={equipment} columns={["code", "name", "status", "next_maintenance_on", "notes"]} /></Module> : null}
          {tab === "finance" ? <Module title="Caja" subtitle="Pagos recibidos y gastos operativos." onNew={() => setExpenseModalOpen(true)} newLabel="Registrar gasto"><DataTable title="Pagos recibidos" rows={payments} columns={["receipt_number", "member_name", "amount", "method", "paid_on", "proof_url", "status"]} /></Module> : null}
          {tab === "system" && user?.is_superadmin ? <SystemAdminPanel data={saas} reload={loadAll} /> : null}
        </section>
      </main>

      <BottomNav tab={tab} onSelect={selectTab} tabs={visibleTabs.filter((item) => item.id !== "system")} />
      <PlanModal open={planModalOpen} editing={Boolean(editingPlanId)} form={planForm} onChange={setPlanForm} onClose={() => setPlanModalOpen(false)} onSubmit={savePlan} />
      <SaleModal open={saleModalOpen} form={saleForm} members={members} plans={plans} onChange={setSaleForm} onClose={() => setSaleModalOpen(false)} onSubmit={sellMembership} />
      <MemberMembershipModal open={memberMembershipModalOpen} member={selectedMember} rows={memberMemberships} saleForm={saleForm} plans={plans} onSaleChange={setSaleForm} onClose={() => setMemberMembershipModalOpen(false)} onSubmit={sellMembership} />
      <ExpenseModal open={expenseModalOpen} form={expenseForm} onChange={setExpenseForm} onClose={() => setExpenseModalOpen(false)} onSubmit={saveExpense} />
      <ClassModal open={classModalOpen} editing={Boolean(editingClassId)} form={classForm} branches={branches} onChange={setClassForm} onClose={() => setClassModalOpen(false)} onSubmit={saveClass} />
      <ClassDetailModal open={classDetailOpen} gymClass={selectedClass} members={members} rows={classBookings} bookingDate={classBookingDate} selectedMemberId={classBookingMemberId} onDateChange={(date) => { setClassBookingDate(date); void reloadClassBookings(date); }} onMemberChange={setClassBookingMemberId} onReserve={reserveClass} onCheckIn={checkInClassBooking} onCancel={cancelClassBooking} onClose={() => setClassDetailOpen(false)} />
      <TrainingSubscriptionModal open={trainingSubscriptionModalOpen} editing={Boolean(editingTrainingSubscriptionId)} form={trainingSubscriptionForm} members={members} onCreateMember={openTrainingMemberModal} onChange={setTrainingSubscriptionForm} onClose={() => { setEditingTrainingSubscriptionId(null); setTrainingSubscriptionModalOpen(false); }} onSubmit={saveTrainingSubscription} />
      <TrainingSubscriptionDetailModal subscription={trainingSubscriptionDetail} onClose={() => setTrainingSubscriptionDetail(null)} onEdit={(subscription) => { setTrainingSubscriptionDetail(null); openEditTrainingSubscription(subscription); }} />
      <MemberModal open={memberModalOpen} editing={Boolean(editingMemberId)} form={memberForm} branches={branches} fitnessGoals={fitnessGoals} onCreateGoal={createFitnessGoal} onChange={setMemberForm} onSearchDni={lookupDni} onClose={() => { setMemberModalContext("general"); setMemberModalOpen(false); }} onSubmit={saveMember} />
      <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

function Dashboard({ dashboard, activeMembers, memberships, notifications }: { dashboard: AnyRow; activeMembers: number; memberships: number; notifications: AnyRow[] }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">{(dashboard.kpis ?? []).map((kpi: AnyRow) => <div key={kpi.label} className={cardClass()}><p className="text-xs font-bold text-zinc-500 sm:text-sm">{kpi.label}</p><p className="mt-2 text-2xl font-black sm:text-3xl">{kpi.value}</p><p className="mt-2 text-[11px] font-semibold text-zinc-400 sm:text-xs">{kpi.hint}</p></div>)}</div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className={`${cardClass()} xl:col-span-2`}><h2 className="text-lg font-black">Operación de hoy</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><MetricCard title="Ingresos hoy" value={dashboard.attendance_today ?? 0} yellow /><MetricCard title="Socios activos" value={activeMembers} dark /><MetricCard title="Planes vendidos" value={memberships} /></div></div>
        <div className={cardClass()}><h2 className="text-lg font-black">Notificaciones</h2><div className="mt-3 space-y-3">{notifications.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl bg-amber-50 p-3 text-sm"><b>{item.title}</b><p className="text-zinc-600">{item.body}</p></div>)}</div></div>
      </div>
    </>
  );
}

function MetricCard({ title, value, yellow, dark }: { title: string; value: ReactNode; yellow?: boolean; dark?: boolean }) {
  return <div className={`rounded-2xl p-4 ${yellow ? "bg-[#ffcc00] text-zinc-950" : dark ? "bg-zinc-950 text-white" : "bg-white text-zinc-950 ring-1 ring-zinc-200"}`}><p className="text-sm font-bold">{title}</p><p className="text-3xl font-black">{value}</p></div>;
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

      {viewMode === "semana" ? <WeeklySchedule classes={scheduleItems} weekdays={weekdays} onEdit={(item) => onEdit(item.source ?? item)} onDetail={(item) => onDetail(item.source ?? item)} /> : null}


      {viewMode === "tabla" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div><h3 className="text-lg font-black">Filtro de mensualidades</h3><p className="text-sm font-semibold text-zinc-500">Por defecto se muestran solo las activas.</p></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass("min-w-48")}>
              <option value="active">Activas</option>
              <option value="inactive">Inactivas</option>
              <option value="cancelled">Canceladas</option>
              <option value="expired">Vencidas</option>
              <option value="all">Todas</option>
            </select>
          </div>
          <DataTable title="Mensualidades de entrenamiento" rows={filteredSubscriptions} columns={["member_name", "discipline", "monthly_fee", "starts_on", "ends_on", "selected_days", "day_schedules", "payment_method", "status"]} action={(row) => <ActionButtons onDetail={() => onDetail(row)} onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />} />
        </div>
      ) : null}
    </div>
  );
}

function WeeklySchedule({ classes, weekdays, onEdit, onDetail }: { classes: AnyRow[]; weekdays: string[]; onEdit: (row: AnyRow) => void; onDetail: (row: AnyRow) => void }) {
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
                    <article key={gymClass.id} className="absolute overflow-hidden rounded-2xl border-l-4 bg-white p-2 shadow-[0_10px_24px_rgba(0,0,0,0.10)] ring-1 ring-zinc-200" style={weeklyClassStyle(gymClass, index)}>
                      <div className="flex h-full flex-col">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-black text-zinc-500">{String(gymClass.starts_at).slice(0, 5)} - {String(gymClass.ends_at).slice(0, 5)}</p>
                          <p className="line-clamp-2 text-sm font-black leading-tight text-zinc-950">{gymClass.name}</p>
                          <p className="truncate text-[11px] font-bold text-zinc-500">{gymClass.category} · {gymClass.level}</p>
                          <p className="truncate text-[11px] text-zinc-500">{gymClass.room ?? "Horario"} · {gymClass.trainer_name ?? "Mensual"}</p>
                        </div>
                        <div className="mt-auto flex flex-wrap gap-1 pt-2">
                          <IconButton title="Ver detalles" onClick={() => onDetail(gymClass)} className="h-8 w-8 bg-white text-zinc-950 ring-1 ring-zinc-200"><Eye className="h-3.5 w-3.5" /></IconButton>
                          <IconButton title="Editar" onClick={() => onEdit(gymClass)} className="h-8 w-8 bg-[#ffcc00] text-zinc-950"><Edit3 className="h-3.5 w-3.5" /></IconButton>
                        </div>
                      </div>
                    </article>
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
            <RequiredLabel>DNI</RequiredLabel>
            <div className="flex gap-2">
              <input required maxLength={8} value={form.dni ?? ""} onChange={(event) => onChange({ ...form, dni: event.target.value.replace(/\D/g, "").slice(0, 8), document_number: event.target.value.replace(/\D/g, "").slice(0, 8) })} className={fieldClass("min-w-0 flex-1")} />
              <button type="button" onClick={() => void onSearchDni(form.dni)} className="rounded-2xl bg-zinc-950 px-4 py-2 text-xs font-black text-white">Buscar</button>
            </div>
          </label>
          {["first_name:Nombres", "last_name:Apellidos", "phone:Teléfono", "email:Correo", "birthdate:Fecha de nacimiento", "emergency_contact_name:Contacto de emergencia", "emergency_contact_phone:Teléfono emergencia"].map((item) => {
            const [field, label] = item.split(":");
            const required = ["first_name", "last_name", "phone"].includes(field);
            return <label key={field} className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel required={required}>{label}</RequiredLabel><input required={required} type={field === "birthdate" ? "date" : "text"} value={form[field] ?? ""} onChange={(event) => onChange({ ...form, [field]: event.target.value })} className={fieldClass()} /></label>;
          })}
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Sede</RequiredLabel><select required value={form.branch_id ?? ""} onChange={(event) => onChange({ ...form, branch_id: event.target.value })} className={fieldClass()}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          {editing ? <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Estado</RequiredLabel><select required value={form.status ?? "active"} onChange={(event) => onChange({ ...form, status: event.target.value })} className={fieldClass()}><option value="active">Activo</option><option value="inactive">Inactivo</option><option value="blocked">Bloqueado</option></select></label> : null}
        </div>
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Objetivo físico<select value={form.fitness_goal ?? ""} onChange={(event) => onChange({ ...form, fitness_goal: event.target.value })} className={fieldClass()}><option value="">Sin objetivo seleccionado</option>{fitnessGoals.map((goal) => <option key={goal.id} value={goal.name}>{goal.name}</option>)}</select></label>
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
  return <Modal open={open} title="Nueva venta" subtitle="Activa una membresía y registra el pago." onClose={onClose}><form onSubmit={onSubmit} className="space-y-3"><label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Socio</RequiredLabel><select required value={form.member_id} onChange={(event) => onChange({ ...form, member_id: event.target.value })} className={fieldClass("w-full")}><option value="">Seleccione socio</option>{members.map((member) => <option key={member.id} value={member.id}>{member.member_code} · {member.first_name} {member.last_name}</option>)}</select></label><label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Plan</RequiredLabel><select required value={form.plan_id} onChange={(event) => onChange({ ...form, plan_id: event.target.value })} className={fieldClass("w-full")}><option value="">Seleccione plan</option>{plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.price)}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Fecha de inicio" type="date" value={form.starts_on} onChange={(value) => onChange({ ...form, starts_on: value })} required /><Field label="Descuento" value={form.discount} onChange={(value) => onChange({ ...form, discount: value })} /></div><PaymentFields method={form.method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} /><FormActions onClose={onClose} submitLabel="Cobrar y activar" /></form></Modal>;
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
              <select required value={saleForm.plan_id} onChange={(event) => onSaleChange({ ...saleForm, plan_id: event.target.value })} className={fieldClass("w-full")}>
                <option value="">Seleccione plan</option>
                {plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.price)}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha de inicio" type="date" value={saleForm.starts_on} onChange={(value) => onSaleChange({ ...saleForm, starts_on: value })} required />
              <Field label="Descuento" value={saleForm.discount} onChange={(value) => onSaleChange({ ...saleForm, discount: value })} />
            </div>
            <PaymentFields method={saleForm.method ?? "cash"} file={saleForm.proof_photo} onMethodChange={(value) => onSaleChange({ ...saleForm, method: value, proof_photo: value === "cash" ? null : saleForm.proof_photo })} onFileChange={(file) => onSaleChange({ ...saleForm, proof_photo: file })} />
          </div>
          <FormActions onClose={onClose} submitLabel="Activar membresía" />
        </form>
      </div>
    </Modal>
  );
}

function ExpenseModal({ open, form, onChange, onClose, onSubmit }: { open: boolean; form: AnyRow; onChange: (form: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return <Modal open={open} title="Registrar gasto" subtitle="Controla egresos operativos del gimnasio." onClose={onClose}><form onSubmit={onSubmit} className="grid gap-3"><Field label="Categoría" value={form.category} onChange={(value) => onChange({ ...form, category: value })} required /><Field label="Proveedor" value={form.supplier} onChange={(value) => onChange({ ...form, supplier: value })} /><Field label="Monto" type="number" value={form.amount} onChange={(value) => onChange({ ...form, amount: value })} required /><Field label="Fecha" type="date" value={form.spent_on} onChange={(value) => onChange({ ...form, spent_on: value })} required /><PaymentFields method={form.payment_method ?? "cash"} file={form.proof_photo} onMethodChange={(value) => onChange({ ...form, payment_method: value, proof_photo: value === "cash" ? null : form.proof_photo })} onFileChange={(file) => onChange({ ...form, proof_photo: file })} /><Field label="Descripción" value={form.description} onChange={(value) => onChange({ ...form, description: value })} /><FormActions onClose={onClose} submitLabel="Guardar gasto" /></form></Modal>;
}

function ClassModal({ open, editing, form, branches, onChange, onClose, onSubmit }: { open: boolean; editing: boolean; form: AnyRow; branches: AnyRow[]; onChange: (form: AnyRow) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) {
  return (
    <Modal open={open} title={editing ? "Editar clase" : "Nueva clase"} subtitle="Programa clases recurrentes por día, nivel, sala y cupos." onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" value={form.name} onChange={(value) => onChange({ ...form, name: value })} required />
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Disciplina</RequiredLabel><select required value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })} className={fieldClass()}>{classDisciplines.map((discipline) => <option key={discipline}>{discipline}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Nivel</RequiredLabel><select required value={form.level} onChange={(event) => onChange({ ...form, level: event.target.value })} className={fieldClass()}><option>Todos</option><option>Principiante</option><option>Intermedio</option><option>Avanzado</option><option>Competidor</option></select></label>
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Día</RequiredLabel><select required value={form.weekday} onChange={(event) => onChange({ ...form, weekday: event.target.value })} className={fieldClass()}>{["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((day) => <option key={day}>{day}</option>)}</select></label>
          <Field label="Hora inicio" type="time" value={form.starts_at} onChange={(value) => onChange({ ...form, starts_at: value })} required />
          <Field label="Hora fin" type="time" value={form.ends_at} onChange={(value) => onChange({ ...form, ends_at: value })} required />
          <Field label="Cupos" type="number" value={form.capacity} onChange={(value) => onChange({ ...form, capacity: value })} required />
          <Field label="Sala / ambiente" value={form.room} onChange={(value) => onChange({ ...form, room: value })} />
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Sede<select value={form.branch_id ?? ""} onChange={(event) => onChange({ ...form, branch_id: event.target.value })} className={fieldClass()}><option value="">Sin sede</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
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
  const [tenantForm, setTenantForm] = useState<AnyRow>({ name: "", slug: "", contact_name: "", contact_email: "", contact_phone: "", plan_name: "Profesional", billing_status: "active", primary_color: "#ffcc00", notes: "", is_active: true });
  const [branchForm, setBranchForm] = useState<AnyRow>({ tenant_id: "", name: "", phone: "", email: "", address: "", city: "Lima", opening_hours: "", capacity: "120", is_active: true });
  const [userForm, setUserForm] = useState<AnyRow>({ name: "", email: "", password: "GymPro2026!", tenant_id: "", branch_id: "", role_id: adminRole?.id ?? "", is_superadmin: false, is_active: true, phone: "" });

  async function saveTenant(event: FormEvent) {
    event.preventDefault();
    await httpClient.post("/api/gym/saas/tenants", tenantForm);
    setTenantForm({ name: "", slug: "", contact_name: "", contact_email: "", contact_phone: "", plan_name: "Profesional", billing_status: "active", primary_color: "#ffcc00", notes: "", is_active: true });
    await reload();
  }

  async function saveBranch(event: FormEvent) {
    event.preventDefault();
    await httpClient.post("/api/gym/saas/branches", { ...branchForm, capacity: Number(branchForm.capacity) });
    setBranchForm({ tenant_id: "", name: "", phone: "", email: "", address: "", city: "Lima", opening_hours: "", capacity: "120", is_active: true });
    await reload();
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    await httpClient.post("/api/gym/saas/users", { ...userForm, role_id: userForm.role_id || adminRole?.id || null });
    setUserForm({ name: "", email: "", password: "GymPro2026!", tenant_id: "", branch_id: "", role_id: adminRole?.id ?? "", is_superadmin: false, is_active: true, phone: "" });
    await reload();
  }

  async function toggleModule(tenant: AnyRow, module: string) {
    const enabled = new Set((tenant.modules ?? []).filter((item: AnyRow) => item.is_enabled).map((item: AnyRow) => item.module));
    if (enabled.has(module)) enabled.delete(module); else enabled.add(module);
    await httpClient.post(`/api/gym/saas/tenants/${tenant.id}/modules`, { modules: Array.from(enabled) });
    await reload();
  }

  return (
    <Module title="Sistema SaaS" subtitle="Clientes, sedes, usuarios administradores y módulos habilitados por cliente.">
      <div className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={saveTenant} className={cardClass()}>
          <h3 className="text-lg font-black">Nuevo cliente</h3>
          <div className="mt-3 grid gap-3">
            <Field label="Nombre comercial" value={tenantForm.name} onChange={(value) => setTenantForm({ ...tenantForm, name: value, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })} required />
            <Field label="Código URL" value={tenantForm.slug} onChange={(value) => setTenantForm({ ...tenantForm, slug: value })} required />
            <Field label="Contacto" value={tenantForm.contact_name} onChange={(value) => setTenantForm({ ...tenantForm, contact_name: value })} />
            <Field label="Correo" type="email" value={tenantForm.contact_email} onChange={(value) => setTenantForm({ ...tenantForm, contact_email: value })} />
            <Field label="Teléfono" value={tenantForm.contact_phone} onChange={(value) => setTenantForm({ ...tenantForm, contact_phone: value })} />
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Estado<select value={tenantForm.billing_status} onChange={(event) => setTenantForm({ ...tenantForm, billing_status: event.target.value })} className={fieldClass()}><option value="active">Activo</option><option value="trial">Prueba</option><option value="paused">Pausado</option><option value="cancelled">Cancelado</option></select></label>
            <FormActions onClose={() => setTenantForm({ ...tenantForm, name: "", slug: "" })} submitLabel="Crear cliente" />
          </div>
        </form>

        <form onSubmit={saveBranch} className={cardClass()}>
          <h3 className="text-lg font-black">Nueva sede</h3>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Cliente</RequiredLabel><select required value={branchForm.tenant_id} onChange={(event) => setBranchForm({ ...branchForm, tenant_id: event.target.value })} className={fieldClass()}><option value="">Seleccione cliente</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <Field label="Nombre de sede" value={branchForm.name} onChange={(value) => setBranchForm({ ...branchForm, name: value })} required />
            <Field label="Dirección" value={branchForm.address} onChange={(value) => setBranchForm({ ...branchForm, address: value })} required />
            <Field label="Ciudad" value={branchForm.city} onChange={(value) => setBranchForm({ ...branchForm, city: value })} required />
            <Field label="Aforo" type="number" value={branchForm.capacity} onChange={(value) => setBranchForm({ ...branchForm, capacity: value })} required />
            <FormActions onClose={() => setBranchForm({ ...branchForm, name: "", address: "" })} submitLabel="Crear sede" />
          </div>
        </form>

        <form onSubmit={saveUser} className={cardClass()}>
          <h3 className="text-lg font-black">Usuario cliente</h3>
          <div className="mt-3 grid gap-3">
            <Field label="Nombre" value={userForm.name} onChange={(value) => setUserForm({ ...userForm, name: value })} required />
            <Field label="Correo" type="email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} required />
            <Field label="Clave inicial" value={userForm.password} onChange={(value) => setUserForm({ ...userForm, password: value })} required />
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Cliente<select value={userForm.tenant_id} onChange={(event) => setUserForm({ ...userForm, tenant_id: event.target.value })} className={fieldClass()}><option value="">Administrador del sistema</option>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">Sede<select value={userForm.branch_id} onChange={(event) => setUserForm({ ...userForm, branch_id: event.target.value })} className={fieldClass()}><option value="">Todas las sedes del cliente</option>{branches.filter((branch) => !userForm.tenant_id || String(branch.tenant_id) === String(userForm.tenant_id)).map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="flex items-center gap-2 rounded-2xl bg-zinc-50 p-4 text-sm font-bold"><input type="checkbox" checked={userForm.is_superadmin} onChange={(event) => setUserForm({ ...userForm, is_superadmin: event.target.checked })} /> Administrador del sistema</label>
            <FormActions onClose={() => setUserForm({ ...userForm, name: "", email: "" })} submitLabel="Crear usuario" />
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
      <DataTable title="Usuarios del sistema" rows={data.users ?? []} columns={["name", "email", "tenant_name", "branch_name", "role_name", "is_superadmin", "is_active"]} />
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
            <select required value={selectedMemberId} onChange={(event) => onMemberChange(event.target.value)} className={fieldClass("w-full")}><option value="">Seleccione socio</option>{members.map((member) => <option key={member.id} value={member.id}>{member.member_code} · {member.first_name} {member.last_name}</option>)}</select>
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
          <select required value={form.member_id} onChange={(event) => onChange({ ...form, member_id: event.target.value })} className={fieldClass()}>
            <option value="">Seleccione socio</option>
            {members.map((member) => <option key={member.id} value={member.id}>{member.member_code} · {member.first_name} {member.last_name}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500"><RequiredLabel>Disciplina</RequiredLabel><select required value={form.discipline} onChange={(event) => onChange({ ...form, discipline: event.target.value })} className={fieldClass()}>{classDisciplines.map((discipline) => <option key={discipline}>{discipline}</option>)}</select></label>
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
  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
        <RequiredLabel>Medio de pago</RequiredLabel>
        <select required value={method || "cash"} onChange={(event) => onMethodChange(event.target.value)} className={fieldClass("w-full")}>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
          <option value="yape">Yape</option>
          <option value="plin">Plin</option>
        </select>
      </label>
      {method !== "cash" ? (
        <label className="grid gap-1 text-xs font-black uppercase tracking-wide text-zinc-500">
          Foto del comprobante
          <input type="file" accept="image/*" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} className={fieldClass("w-full file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white")} />
          {file ? <span className="text-xs font-semibold normal-case tracking-normal text-zinc-500">{file.name}</span> : null}
          {!file && existingProofUrl ? <a href={existingProofUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit rounded-xl bg-blue-50 px-3 py-2 text-xs font-black normal-case tracking-normal text-blue-700">Ver comprobante actual</a> : null}
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

function BottomNav({ tab, tabs, onSelect }: { tab: Tab; tabs: { id: Tab; label: string; icon: any }[]; onSelect: (tab: Tab) => void }) {
  return <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-md grid-cols-4 gap-1">{tabs.slice(0, 4).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => onSelect(item.id)} className={`rounded-2xl px-2 py-2 text-[10px] font-black ${tab === item.id ? "bg-[#ffcc00] text-zinc-950" : "text-zinc-500"}`}><Icon className="mx-auto mb-1 h-5 w-5" />{item.label}</button>; })}</div></nav>;
}
