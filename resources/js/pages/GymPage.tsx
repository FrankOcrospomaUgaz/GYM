import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Activity, Bell, CalendarDays, CreditCard, Dumbbell, LogOut, Menu, Search, ShieldCheck, Users, Wrench, X } from "lucide-react";
import { httpClient } from "../http/client";
import { useAuth } from "../context/AuthContext";

type AnyRow = Record<string, any>;
type Tab = "dashboard" | "members" | "plans" | "memberships" | "attendance" | "classes" | "finance" | "equipment";

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Panel", icon: Activity },
  { id: "members", label: "Socios", icon: Users },
  { id: "plans", label: "Planes", icon: CreditCard },
  { id: "memberships", label: "Membresías", icon: CreditCard },
  { id: "attendance", label: "Accesos", icon: ShieldCheck },
  { id: "classes", label: "Clases", icon: CalendarDays },
  { id: "finance", label: "Caja", icon: Bell },
  { id: "equipment", label: "Equipos", icon: Wrench },
];

const emptyMember = {
  first_name: "",
  last_name: "",
  document_type: "DNI",
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

function money(value: unknown) {
  return `S/ ${Number(value ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

function cardClass() {
  return "rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5";
}

function fieldClass(extra = "") {
  return `min-h-11 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-[#ffcc00] transition focus:border-[#ffcc00] focus:ring-4 focus:ring-[#ffcc00]/20 ${extra}`;
}

function formatCell(column: string, value: unknown) {
  if (column.includes("amount") || column === "price") {
    return money(value);
  }
  if (typeof value === "boolean" || value === 0 || value === 1) {
    return Boolean(value) ? "Sí" : "No";
  }
  return String(value ?? "-");
}

export function GymPage() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState<AnyRow>({});
  const [members, setMembers] = useState<AnyRow[]>([]);
  const [plans, setPlans] = useState<AnyRow[]>([]);
  const [branches, setBranches] = useState<AnyRow[]>([]);
  const [memberships, setMemberships] = useState<AnyRow[]>([]);
  const [payments, setPayments] = useState<AnyRow[]>([]);
  const [attendance, setAttendance] = useState<AnyRow[]>([]);
  const [classes, setClasses] = useState<AnyRow[]>([]);
  const [equipment, setEquipment] = useState<AnyRow[]>([]);
  const [notifications, setNotifications] = useState<AnyRow[]>([]);
  const [memberForm, setMemberForm] = useState<AnyRow>(emptyMember);
  const [planForm, setPlanForm] = useState<AnyRow>(emptyPlan);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [saleForm, setSaleForm] = useState({ member_id: "", plan_id: "", starts_on: new Date().toISOString().slice(0, 10), discount: "0", method: "cash", notes: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "", supplier: "", amount: "", spent_on: new Date().toISOString().slice(0, 10), payment_method: "cash", description: "" });
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const activeMembers = useMemo(() => members.filter((member) => member.status === "active"), [members]);
  const currentTab = tabs.find((item) => item.id === tab) ?? tabs[0];

  function selectTab(nextTab: Tab) {
    setTab(nextTab);
    setMobileMenuOpen(false);
  }

  async function loadAll() {
    const [dash, branchRes, planRes, memberRes, membershipRes, paymentRes, attendanceRes, classRes, equipmentRes, notificationRes] = await Promise.all([
      httpClient.get("/api/gym/dashboard"),
      httpClient.get("/api/gym/branches"),
      httpClient.get("/api/gym/plans"),
      httpClient.get("/api/gym/members", { params: { search } }),
      httpClient.get("/api/gym/memberships"),
      httpClient.get("/api/gym/payments"),
      httpClient.get("/api/gym/attendance"),
      httpClient.get("/api/gym/classes"),
      httpClient.get("/api/gym/equipment"),
      httpClient.get("/api/gym/notifications"),
    ]);
    setDashboard(dash.data);
    setBranches(branchRes.data);
    setPlans(planRes.data);
    setMembers(memberRes.data);
    setMemberships(membershipRes.data);
    setPayments(paymentRes.data);
    setAttendance(attendanceRes.data);
    setClasses(classRes.data);
    setEquipment(equipmentRes.data);
    setNotifications(notificationRes.data);
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function saveMember(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    await httpClient.post("/api/gym/members", { ...memberForm, branch_id: memberForm.branch_id || null });
    setMemberForm(emptyMember);
    setMessage("Socio registrado correctamente.");
    await loadAll();
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

    setPlanForm(emptyPlan);
    setEditingPlanId(null);
    await loadAll();
  }

  function editPlan(plan: AnyRow) {
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
    setTab("plans");
  }

  async function deletePlan(plan: AnyRow) {
    if (!confirm(`¿Eliminar o desactivar el plan "${plan.name}"?`)) {
      return;
    }
    const response = await httpClient.delete(`/api/gym/plans/${plan.id}`);
    setMessage(response.data?.message ?? "Plan eliminado correctamente.");
    await loadAll();
  }

  async function sellMembership(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    await httpClient.post("/api/gym/memberships", saleForm);
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
    await httpClient.post("/api/gym/expenses", expenseForm);
    setExpenseForm({ category: "", supplier: "", amount: "", spent_on: new Date().toISOString().slice(0, 10), payment_method: "cash", description: "" });
    setMessage("Gasto registrado.");
    await loadAll();
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
          {tabs.map((item) => {
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
          {tab === "dashboard" ? (
            <>
              <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">{(dashboard.kpis ?? []).map((kpi: AnyRow) => <div key={kpi.label} className={cardClass()}><p className="text-xs font-bold text-zinc-500 sm:text-sm">{kpi.label}</p><p className="mt-2 text-2xl font-black sm:text-3xl">{kpi.value}</p><p className="mt-2 text-[11px] font-semibold text-zinc-400 sm:text-xs">{kpi.hint}</p></div>)}</div>
              <div className="grid gap-5 xl:grid-cols-3">
                <div className={`${cardClass()} xl:col-span-2`}><h2 className="text-lg font-black">Operación de hoy</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[#ffcc00] p-4"><p className="text-sm font-bold">Ingresos hoy</p><p className="text-3xl font-black">{dashboard.attendance_today ?? 0}</p></div><div className="rounded-2xl bg-zinc-950 p-4 text-white"><p className="text-sm font-bold">Socios activos</p><p className="text-3xl font-black">{activeMembers.length}</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-200"><p className="text-sm font-bold">Planes vendidos</p><p className="text-3xl font-black">{memberships.length}</p></div></div></div>
                <div className={cardClass()}><h2 className="text-lg font-black">Notificaciones</h2><div className="mt-3 space-y-3">{notifications.slice(0, 5).map((item) => <div key={item.id} className="rounded-2xl bg-amber-50 p-3 text-sm"><b>{item.title}</b><p className="text-zinc-600">{item.body}</p></div>)}</div></div>
              </div>
            </>
          ) : null}

          {tab === "members" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
              <form onSubmit={saveMember} className={cardClass()}>
                <h2 className="text-lg font-black">Registrar socio</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {["first_name", "last_name", "document_number", "phone", "email", "birthdate", "emergency_contact_name", "emergency_contact_phone"].map((field) => <input key={field} required={["first_name", "last_name", "document_number", "phone"].includes(field)} type={field === "birthdate" ? "date" : "text"} value={memberForm[field] ?? ""} onChange={(event) => setMemberForm({ ...memberForm, [field]: event.target.value })} placeholder={field.replaceAll("_", " ")} className={fieldClass()} />)}
                  <select value={memberForm.branch_id} onChange={(event) => setMemberForm({ ...memberForm, branch_id: event.target.value })} className={fieldClass()}><option value="">Sede</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
                  <input value={memberForm.fitness_goal} onChange={(event) => setMemberForm({ ...memberForm, fitness_goal: event.target.value })} placeholder="objetivo físico" className={fieldClass()} />
                </div>
                <textarea value={memberForm.medical_notes} onChange={(event) => setMemberForm({ ...memberForm, medical_notes: event.target.value })} placeholder="observaciones médicas" className={fieldClass("mt-3 min-h-24 w-full")} />
                <button className="mt-4 w-full rounded-2xl bg-[#ffcc00] px-5 py-3 font-black text-zinc-950 hover:brightness-95">Guardar socio</button>
              </form>
              <DataTable title="Socios registrados" rows={members} columns={["member_code", "first_name", "last_name", "document_number", "phone", "status", "branch_name"]} action={(row) => <button onClick={() => void checkIn(row.id)} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white">Ingreso</button>} />
            </div>
          ) : null}

          {tab === "plans" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
              <form onSubmit={savePlan} className={cardClass()}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">{editingPlanId ? "Editar plan" : "Crear plan"}</h2><p className="mt-1 text-sm text-zinc-500">Precio, duración, beneficios y disponibilidad.</p></div>{editingPlanId ? <button type="button" onClick={() => { setEditingPlanId(null); setPlanForm(emptyPlan); }} className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold">Nuevo</button> : null}</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input required value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} placeholder="Nombre del plan" className={fieldClass()} />
                  <input required value={planForm.code} onChange={(event) => setPlanForm({ ...planForm, code: event.target.value })} placeholder="Código único" className={fieldClass("uppercase")} />
                  <input required type="number" min="0" step="0.01" value={planForm.price} onChange={(event) => setPlanForm({ ...planForm, price: event.target.value })} placeholder="Precio" className={fieldClass()} />
                  <input required type="number" min="1" value={planForm.duration_days} onChange={(event) => setPlanForm({ ...planForm, duration_days: event.target.value })} placeholder="Duración días" className={fieldClass()} />
                  <input required type="number" min="0" value={planForm.grace_days} onChange={(event) => setPlanForm({ ...planForm, grace_days: event.target.value })} placeholder="Días de gracia" className={fieldClass()} />
                  <input type="number" min="1" value={planForm.daily_access_limit} onChange={(event) => setPlanForm({ ...planForm, daily_access_limit: event.target.value })} placeholder="Límite diario vacío = ilimitado" className={fieldClass()} />
                </div>
                <div className="mt-4 grid gap-3 rounded-2xl bg-zinc-50 p-4 text-sm font-bold">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={planForm.includes_classes} onChange={(event) => setPlanForm({ ...planForm, includes_classes: event.target.checked })} /> Incluye clases grupales</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={planForm.includes_trainer} onChange={(event) => setPlanForm({ ...planForm, includes_trainer: event.target.checked })} /> Incluye entrenador</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={planForm.is_active} onChange={(event) => setPlanForm({ ...planForm, is_active: event.target.checked })} /> Activo para ventas</label>
                </div>
                <textarea value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} placeholder="Descripción comercial del plan" className={fieldClass("mt-3 min-h-24 w-full")} />
                <button className="mt-4 w-full rounded-2xl bg-[#ffcc00] px-5 py-3 font-black text-zinc-950 hover:brightness-95">{editingPlanId ? "Actualizar plan" : "Guardar plan"}</button>
              </form>
              <DataTable title="Planes del gimnasio" rows={plans} columns={["code", "name", "price", "duration_days", "grace_days", "daily_access_limit", "includes_classes", "includes_trainer", "is_active"]} action={(row) => <div className="flex flex-wrap gap-2"><button onClick={() => editPlan(row)} className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-bold text-white">Editar</button><button onClick={() => void deletePlan(row)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Eliminar</button></div>} />
            </div>
          ) : null}

          {tab === "memberships" ? (
            <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
              <form onSubmit={sellMembership} className={cardClass()}>
                <h2 className="text-lg font-black">Vender membresía</h2>
                <select required value={saleForm.member_id} onChange={(event) => setSaleForm({ ...saleForm, member_id: event.target.value })} className={fieldClass("mt-4 w-full")}><option value="">Socio</option>{members.map((member) => <option key={member.id} value={member.id}>{member.member_code} · {member.first_name} {member.last_name}</option>)}</select>
                <select required value={saleForm.plan_id} onChange={(event) => setSaleForm({ ...saleForm, plan_id: event.target.value })} className={fieldClass("mt-3 w-full")}><option value="">Plan</option>{plans.filter((plan) => plan.is_active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {money(plan.price)}</option>)}</select>
                <div className="mt-3 grid gap-3 sm:grid-cols-2"><input type="date" value={saleForm.starts_on} onChange={(event) => setSaleForm({ ...saleForm, starts_on: event.target.value })} className={fieldClass()} /><input value={saleForm.discount} onChange={(event) => setSaleForm({ ...saleForm, discount: event.target.value })} placeholder="Descuento" className={fieldClass()} /></div>
                <select value={saleForm.method} onChange={(event) => setSaleForm({ ...saleForm, method: event.target.value })} className={fieldClass("mt-3 w-full")}><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="yape">Yape</option><option value="plin">Plin</option></select>
                <button className="mt-4 w-full rounded-2xl bg-[#ffcc00] px-5 py-3 font-black">Cobrar y activar</button>
              </form>
              <DataTable title="Membresías activadas" rows={memberships} columns={["member_name", "plan_name", "starts_on", "ends_on", "price", "discount", "status"]} />
            </div>
          ) : null}

          {tab === "attendance" ? <DataTable title="Control de accesos" rows={attendance} columns={["member_name", "checked_in_at", "checked_out_at", "result", "notes"]} /> : null}
          {tab === "classes" ? <DataTable title="Clases y horarios" rows={classes} columns={["name", "category", "weekday", "starts_at", "ends_at", "capacity", "trainer_name"]} /> : null}
          {tab === "equipment" ? <DataTable title="Equipos y mantenimiento" rows={equipment} columns={["code", "name", "status", "next_maintenance_on", "notes"]} /> : null}
          {tab === "finance" ? (
            <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
              <form onSubmit={saveExpense} className={cardClass()}><h2 className="text-lg font-black">Registrar gasto</h2>{["category", "supplier", "amount", "spent_on", "payment_method", "description"].map((field) => <input key={field} required={["category", "amount", "spent_on", "payment_method"].includes(field)} type={field === "spent_on" ? "date" : "text"} value={(expenseForm as AnyRow)[field]} onChange={(event) => setExpenseForm({ ...expenseForm, [field]: event.target.value })} placeholder={field.replaceAll("_", " ")} className={fieldClass("mt-3 w-full")} />)}<button className="mt-4 w-full rounded-2xl bg-zinc-950 px-5 py-3 font-black text-white">Guardar gasto</button></form>
              <DataTable title="Pagos recibidos" rows={payments} columns={["receipt_number", "member_name", "amount", "method", "paid_on", "status"]} />
            </div>
          ) : null}
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 px-2 py-2 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {tabs.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => selectTab(item.id)} className={`rounded-2xl px-2 py-2 text-[10px] font-black ${tab === item.id ? "bg-[#ffcc00] text-zinc-950" : "text-zinc-500"}`}><Icon className="mx-auto mb-1 h-5 w-5" />{item.label}</button>;
          })}
        </div>
      </nav>
    </div>
  );
}

function DataTable({ title, rows, columns, action }: { title: string; rows: AnyRow[]; columns: string[]; action?: (row: AnyRow) => ReactNode }) {
  return (
    <div className={cardClass()}>
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="min-w-0 truncate text-lg font-black">{title}</h2><span className="shrink-0 rounded-full bg-[#ffcc00] px-3 py-1 text-xs font-black text-zinc-950">{rows.length} registros</span></div>
      <div className="space-y-3 md:hidden">
        {rows.length === 0 ? <p className="rounded-2xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-500">No hay registros para mostrar.</p> : null}
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="grid gap-2">
              {columns.slice(0, 6).map((column) => <div key={column} className="flex items-start justify-between gap-3 border-b border-zinc-200/70 pb-2 last:border-0 last:pb-0"><span className="text-[11px] font-black uppercase tracking-wide text-zinc-500">{column.replaceAll("_", " ")}</span><span className="max-w-[55%] text-right text-sm font-semibold text-zinc-900">{formatCell(column, row[column])}</span></div>)}
            </div>
            {action ? <div className="mt-4 flex justify-end">{action(row)}</div> : null}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-100 md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">{columns.map((column) => <th key={column} className="px-3 py-3">{column.replaceAll("_", " ")}</th>)}{action ? <th className="px-3 py-3">Acción</th> : null}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70">{columns.map((column) => <td key={column} className="px-3 py-3">{formatCell(column, row[column])}</td>)}{action ? <td className="px-3 py-3">{action(row)}</td> : null}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
