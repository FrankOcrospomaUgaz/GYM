import { Shield, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createUser, deleteUser, fetchUser, fetchUsersPage, updateUser, type ManagedUser } from "../users/api";
import { ConfirmModal } from "../components/ConfirmModal";
import { FormModal } from "../xpande/FormModal";
import { apiErrorMessage } from "../xpande/apiError";
import { getJson } from "../xpande/http";
import {
  LabCircleIconAction,
  LabDataPager,
  LabNoticeModal,
  LabSortableTh,
} from "../xpande/LabTableKit";
import {
  LabBreadcrumbs,
  LabField,
  LabPageHeader,
  LabToolbar,
  labCrudMainClass,
  labGhostBtn,
  labInputClass,
  labPanelClass,
  labPrimaryBtn,
  labStatusPill,
  initialsFrom,
} from "../xpande/XpandeUi";
import { useApexTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

function downloadUsersCsv(rows: ManagedUser[]) {
  const head = ["id", "name", "email", "role", "areas", "created_at"];
  const esc = (v: string | number | boolean) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    head.join(","),
    ...rows.map((u) =>
      [
        u.id,
        u.name,
        u.email,
        u.role?.slug ?? "",
        (u.areas ?? []).map((a) => a.name).join(";"),
        u.created_at ?? "",
      ]
        .map(esc)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type RoleOpt = { id: number; name: string; slug: string };
type AreaOpt = { id: number; name: string };
type SortCol = "id" | "name" | "email" | "created_at";
type TabKey = "all" | "admins" | "users";

export function UsersPage() {
  const { isLight } = useApexTheme();
  const { user } = useAuth();
  const [rows, setRows] = useState<ManagedUser[]>([]);
  const [meta, setMeta] = useState<{ page: number; lastPage: number; total: number; perPage: number }>({
    page: 1,
    lastPage: 1,
    total: 0,
    perPage: 50,
  });
  const [loading, setLoading] = useState(true);
  const [modalFormErr, setModalFormErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [sortCol, setSortCol] = useState<SortCol>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [perPage, setPerPage] = useState(50);

  const [roles, setRoles] = useState<RoleOpt[]>([]);
  const [areasList, setAreasList] = useState<AreaOpt[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ManagedUser | null>(null);
  const [notice, setNotice] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    is_superadmin: false,
    role_id: "" as "" | number,
    phone: "",
    is_active: true,
    contract_type: "",
    salary: "",
    cost_per_hour: "",
    availability: "",
    specialty: "",
    area_ids: [] as number[],
  });

  const scopeFromTab = (t: TabKey): "all" | "admins" | "users" => {
    if (t === "admins") return "admins";
    if (t === "users") return "users";
    return "all";
  };

  const fetchList = useCallback(
    async (targetPage: number, nextPerPage?: number) => {
      const pp = nextPerPage ?? perPage;
      setLoading(true);
      try {
        const res = await fetchUsersPage({
          page: targetPage,
          q,
          scope: scopeFromTab(tab),
          sort: sortCol,
          dir: sortDir,
          per_page: pp,
        });
        setRows(res.data);
        setMeta({
          page: res.current_page,
          lastPage: Math.max(1, res.last_page),
          total: res.total,
          perPage: res.per_page ?? pp,
        });
      } catch (e: unknown) {
        setNotice({
          variant: "error",
          title: "Lista de usuarios",
          message: apiErrorMessage(e, "No se pudo cargar la lista."),
        });
      } finally {
        setLoading(false);
      }
    },
    [q, tab, sortCol, sortDir, perPage],
  );

  useEffect(() => {
    void getJson<RoleOpt[]>("/api/roles").then(setRoles).catch(() => setRoles([]));
    void getJson<AreaOpt[]>("/api/areas", { active_only: false }).then(setAreasList).catch(() => setAreasList([]));
  }, []);

  useEffect(() => {
    const delay = q.trim() === "" ? 0 : 280;
    const id = window.setTimeout(() => {
      void fetchList(1);
    }, delay);
    return () => window.clearTimeout(id);
  }, [fetchList, q, tab, sortCol, sortDir, perPage]);

  const onSortHeader = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" || col === "email" ? "asc" : "desc");
    }
  };

  const sortState = (col: SortCol): "asc" | "desc" | null => (sortCol === col ? sortDir : null);

  const toggleArea = (id: number) => {
    setForm((f) => ({
      ...f,
      area_ids: f.area_ids.includes(id) ? f.area_ids.filter((x) => x !== id) : [...f.area_ids, id],
    }));
  };

  const openCreate = () => {
    setModalFormErr(null);
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      password: "",
      is_superadmin: false,
      role_id: "",
      phone: "",
      is_active: true,
      contract_type: "",
      salary: "",
      cost_per_hour: "",
      availability: "",
      specialty: "",
      area_ids: [],
    });
    setModalOpen(true);
  };

  const openEdit = async (id: number) => {
    setModalFormErr(null);
    try {
      const u = await fetchUser(id);
      setEditingId(u.id);
      setForm({
        name: u.name,
        email: u.email,
        password: "",
        is_superadmin: u.is_superadmin,
        role_id: u.role_id ?? "",
        phone: u.phone ?? "",
        is_active: Boolean(u.is_active ?? true),
        contract_type: u.contract_type ?? "",
        salary: u.salary ?? "",
        cost_per_hour: u.cost_per_hour ?? "",
        availability: u.availability ?? "",
        specialty: u.specialty ?? "",
        area_ids: (u.areas ?? []).map((a) => a.id),
      });
      setModalOpen(true);
    } catch (e: unknown) {
      setNotice({
        variant: "error",
        title: "Usuario",
        message: apiErrorMessage(e, "No se pudo cargar el usuario."),
      });
    }
  };

  const submit = async () => {
    setModalFormErr(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        is_superadmin: form.is_superadmin,
        phone: form.phone || null,
        is_active: form.is_active,
        contract_type: form.contract_type || null,
        salary: form.salary ? Number(form.salary) : null,
        cost_per_hour: form.cost_per_hour ? Number(form.cost_per_hour) : null,
        availability: form.availability || null,
        specialty: form.specialty || null,
        area_ids: form.area_ids,
      };
      if (form.role_id !== "") payload.role_id = form.role_id;
      if (form.password.trim()) payload.password = form.password;
      if (editingId) {
        if (!payload.password) delete payload.password;
        await updateUser(editingId, payload);
      } else {
        if (!form.password.trim()) {
          setModalFormErr("La contraseña es obligatoria para nuevos usuarios.");
          return;
        }
        await createUser(payload);
      }
      setModalOpen(false);
      await fetchList(meta.page);
      setNotice({
        variant: "success",
        title: editingId ? "Usuario actualizado" : "Usuario creado",
        message: editingId ? "Los datos se guardaron correctamente." : "El nuevo usuario puede iniciar sesión con el correo indicado.",
      });
    } catch (e: unknown) {
      setNotice({
        variant: "error",
        title: "No se guardó",
        message: apiErrorMessage(e, "No se pudo guardar el usuario."),
      });
    }
  };

  const confirmRemove = async () => {
    if (!pendingDelete) return;
    const nm = pendingDelete.name;
    const idKill = pendingDelete.id;
    setPendingDelete(null);
    try {
      await deleteUser(idKill);
      const nextLast = meta.page > 1 && rows.length <= 1 ? meta.page - 1 : meta.page;
      await fetchList(Math.min(nextLast, meta.lastPage || 1));
      setNotice({ variant: "success", title: "Eliminado", message: `${nm} se eliminó del sistema.` });
    } catch (e: unknown) {
      setNotice({
        variant: "error",
        title: "Eliminación cancelada",
        message: apiErrorMessage(e, "No se pudo eliminar (el superadmin o su cuenta están protegidos)."),
      });
    }
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs isLight={isLight} items={[{ label: "Dashboard", to: "/" }, { label: "Usuarios internos" }]} />
      <LabPageHeader
        isLight={isLight}
        title="Consultores / usuarios internos"
        subtitle="Tabla profesional con búsqueda, orden, paginación y acciones con tooltip."
        action={
          <button type="button" className={labPrimaryBtn(isLight)} onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </button>
        }
      />

      <LabToolbar
        isLight={isLight}
        tabs={[
          { id: "all", label: "Todos" },
          { id: "admins", label: "Superadmins" },
          { id: "users", label: "Equipo" },
        ]}
        activeTab={tab}
        onTab={(id) => {
          setTab(id as TabKey);
        }}
        search={q}
        onSearch={setQ}
        searchPlaceholder="Buscar por nombre o correo…"
        right={
          <button type="button" className={labGhostBtn(isLight)} onClick={() => downloadUsersCsv(rows)}>
            Exportar página
          </button>
        }
      />

      <div className={labPanelClass(isLight)}>
        {loading ? (
          <p className={isLight ? "py-8 text-center text-[#6B7280]" : "py-8 text-center text-zinc-500"}>Cargando…</p>
        ) : (
          <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
            <table
              className={[
                "w-full min-w-[860px] text-left text-sm",
                isLight ? "[&_tbody_tr:nth-child(even)]:bg-[#F9FAFB]/90" : "[&_tbody_tr:nth-child(even)]:bg-white/[0.02]",
              ].join(" ")}
            >
              <thead>
                <tr className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>
                  <th className="w-10 pb-3 pr-2" aria-hidden />
                  <LabSortableTh label="Nombre" sorted={sortState("name")} isLight={isLight} onToggle={() => onSortHeader("name")} />
                  <LabSortableTh label="Correo" sorted={sortState("email")} isLight={isLight} onToggle={() => onSortHeader("email")} />
                  <th className="pb-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide">Rol</th>
                  <th className="pb-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide">Áreas</th>
                  <LabSortableTh
                    label="Alta"
                    sorted={sortState("created_at")}
                    isLight={isLight}
                    onToggle={() => onSortHeader("created_at")}
                    className="w-28 whitespace-nowrap"
                  />
                  <LabSortableTh label="ID" sorted={sortState("id")} isLight={isLight} onToggle={() => onSortHeader("id")} className="w-20" align="right" />
                  <th className="w-[5.25rem] pb-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className={isLight ? "border-t border-[#F3F4F6]" : "border-t border-white/[0.06]"}>
                    <td className="py-3 pr-2">
                      <span
                        className={[
                          "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
                          isLight ? "bg-[#E6F3FF] text-[#005BBF]" : "bg-[#0a2744] text-[#7AB8FF]",
                        ].join(" ")}
                      >
                        {initialsFrom(u.name)}
                      </span>
                    </td>
                    <td className={["py-3 pr-3 font-medium", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>{u.name}</td>
                    <td className={["py-3 pr-3", isLight ? "text-[#4B5563]" : "text-zinc-300"].join(" ")}>{u.email}</td>
                    <td className="py-3 pr-3">
                      <span className={labStatusPill(u.is_superadmin ? "ok" : "neutral", isLight)}>
                        {u.role?.name ?? (u.is_superadmin ? "Superadmin" : "—")}
                      </span>
                    </td>
                    <td className={["py-3 pr-3 text-xs", isLight ? "text-[#6B7280]" : "text-zinc-400"].join(" ")}>
                      {(u.areas ?? []).map((a) => a.name).join(", ") || "—"}
                    </td>
                    <td className={["py-3 pr-3 text-xs whitespace-nowrap", isLight ? "text-[#6B7280]" : "text-zinc-400"].join(" ")}>
                      {u.created_at ? String(u.created_at).slice(0, 10) : "—"}
                    </td>
                    <td className={["py-3 text-right text-xs tabular-nums", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{u.id}</td>
                    <td className="py-3 text-right align-middle">
                      <div className="flex justify-end gap-2">
                        <LabCircleIconAction variant="edit" tooltip="Editar" onClick={() => void openEdit(u.id)} ariaLabel={`Editar ${u.name}`} />
                        <LabCircleIconAction
                          variant="delete"
                          tooltip="Eliminar"
                          disabled={u.is_superadmin || user?.id === u.id}
                          onClick={() => setPendingDelete(u)}
                          ariaLabel={`Eliminar ${u.name}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <LabDataPager
          page={meta.page}
          lastPage={meta.lastPage}
          total={meta.total}
          perPage={meta.perPage}
          isLight={isLight}
          onPerPageChange={(pp) => {
            setPerPage(pp);
          }}
          onPageChange={(p) => void fetchList(p)}
        />
      </div>

      <p className={["mt-3 inline-flex items-center gap-2 text-xs", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
        <Shield className="h-4 w-4" />
        Solo administradores pueden gestionar usuarios. El superadmin inicial no puede borrarse a sí mismo.
      </p>

      <LabNoticeModal
        open={notice !== null}
        variant={notice?.variant ?? "success"}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        isLight={isLight}
        onClose={() => setNotice(null)}
      />

      <ConfirmModal
        open={pendingDelete !== null}
        title="Eliminar usuario"
        message={pendingDelete ? `¿Confirma eliminar a «${pendingDelete.name}»? Esta acción no se puede deshacer.` : ""}
        confirmText="Eliminar"
        danger
        isLight={isLight}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingDelete(null)}
      />

      <FormModal
        open={modalOpen}
        title={editingId ? "Editar usuario" : "Nuevo usuario"}
        subtitle="Asigne rol y áreas para aplicar las reglas de visibilidad del sistema."
        isLight={isLight}
        onClose={() => setModalOpen(false)}
        wide
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void submit()}>
              Guardar
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <LabField label="Nombre completo" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </LabField>
          <LabField label="Correo" isLight={isLight}>
            <input className={labInputClass(isLight)} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </LabField>
          <LabField label={editingId ? "Nueva contraseña (opcional)" : "Contraseña"} isLight={isLight}>
            <input className={labInputClass(isLight)} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </LabField>
          <LabField label="Teléfono" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </LabField>
          <LabField label="Rol" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.role_id === "" ? "" : String(form.role_id)} onChange={(e) => setForm({ ...form, role_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">Seleccionar…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </LabField>
          <LabField label="Contrato / tipo" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })} />
          </LabField>
          <LabField label="Sueldo" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
          </LabField>
          <LabField label="Costo por hora" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.cost_per_hour} onChange={(e) => setForm({ ...form, cost_per_hour: e.target.value })} />
          </LabField>
          <LabField label="Disponibilidad" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
          </LabField>
          <LabField label="Especialidad" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          </LabField>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4 pt-2">
            <label className={["flex items-center gap-2 text-sm font-medium", isLight ? "text-[#374151]" : "text-zinc-200"].join(" ")}>
              <input type="checkbox" checked={form.is_superadmin} onChange={(e) => setForm({ ...form, is_superadmin: e.target.checked })} />
              Superadmin
            </label>
            <label className={["flex items-center gap-2 text-sm font-medium", isLight ? "text-[#374151]" : "text-zinc-200"].join(" ")}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Activo
            </label>
          </div>
          <LabField label="Áreas asignadas" isLight={isLight} className="sm:col-span-2">
            <div
              className={[
                "flex flex-wrap gap-2 rounded-lg border p-3",
                isLight ? "border-[#E5E7EB] bg-[#F9FAFB]" : "border-white/[0.06] bg-[#0a0a0a]/60",
              ].join(" ")}
            >
              {areasList.map((a) => (
                <label key={a.id} className={["flex items-center gap-1.5 text-xs font-medium", isLight ? "text-[#374151]" : "text-zinc-200"].join(" ")}>
                  <input type="checkbox" checked={form.area_ids.includes(a.id)} onChange={() => toggleArea(a.id)} />
                  {a.name}
                </label>
              ))}
            </div>
          </LabField>
          {modalFormErr ? <p className="sm:col-span-2 text-sm font-medium text-red-600">{modalFormErr}</p> : null}
        </div>
      </FormModal>
    </main>
  );
}
