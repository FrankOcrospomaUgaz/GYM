import { ExternalLink, FolderKanban } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ConfirmModal } from "../components/ConfirmModal";
import { FormModal } from "../xpande/FormModal";
import { apiErrorMessage } from "../xpande/apiError";
import type { LaravelPaginated } from "../xpande/http";
import { deleteJson, getJson, postJson, putJson } from "../xpande/http";
import {
  LabCircleIconAction,
  LabDataPager,
  LabNoticeModal,
  LabSortableTh,
  circleRowActionClass,
} from "../xpande/LabTableKit";
import {
  LabBreadcrumbs,
  LabField,
  LabPageHeader,
  labCrudMainClass,
  labGhostBtn,
  labInputClass,
  labPanelClass,
  labPrimaryBtn,
} from "../xpande/XpandeUi";
import { useApexTheme } from "../context/ThemeContext";

type AreaOpt = { id: number; name: string };
type ClientOpt = { id: number; legal_name: string };
type UserOpt = { id: number; name: string };
type ProjRow = {
  id: number;
  name: string;
  status: string;
  created_at?: string;
  client_id?: number;
  budget?: string | null;
  lead_user_id?: number | null;
  service_type?: string | null;
  start_date?: string | null;
  end_estimated?: string | null;
  description?: string | null;
  objectives?: string | null;
  deliverables?: string | null;
  client?: { legal_name?: string };
  areas?: { id: number; name: string }[];
  users?: { id: number }[];
};
type ProjSortCol = "id" | "name" | "client" | "status" | "start_date" | "created_at";

export function ProjectsPage() {
  const { isLight } = useApexTheme();
  const loc = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState<LaravelPaginated<ProjRow> | null>(null);
  const [page, setPage] = useState(1);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [sortCol, setSortCol] = useState<ProjSortCol>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [perPage, setPerPage] = useState(30);
  const [notice, setNotice] = useState<{ variant: "success" | "error"; title: string; message: string } | null>(null);
  const [pendingCancel, setPendingCancel] = useState<ProjRow | null>(null);

  const [form, setForm] = useState({
    client_id: "" as "" | number,
    name: "",
    service_type: "",
    start_date: "",
    end_estimated: "",
    status: "pending",
    budget: "",
    lead_user_id: "" as "" | number,
    description: "",
    objectives: "",
    deliverables: "",
    area_ids: [] as number[],
    user_ids: [] as number[],
  });

  const fetchProjects = useCallback(
    async (targetPage: number, nextPer?: number) => {
      const pp = nextPer ?? perPage;
      const res = await getJson<LaravelPaginated<ProjRow>>("/api/projects", {
        page: targetPage,
        q: q.trim() || undefined,
        sort: sortCol,
        dir: sortDir,
        per_page: pp,
      });
      setData(res);
      setPage(res.current_page);
    },
    [q, sortCol, sortDir, perPage],
  );

  useEffect(() => {
    void getJson<LaravelPaginated<ClientOpt>>("/api/clients", { per_page: 150 }).then((r) => setClients(r.data));
    void getJson<AreaOpt[]>("/api/areas", { active_only: false }).then(setAreas);
    void getJson<UserOpt[]>("/api/collaborators").then(setUsers);
  }, []);

  useEffect(() => {
    const delay = q.trim() === "" ? 0 : 260;
    const id = window.setTimeout(() => {
      void fetchProjects(1).catch((e: unknown) => {
        setNotice({ variant: "error", title: "Proyectos", message: apiErrorMessage(e, "No se pudo cargar el listado.") });
      });
    }, delay);
    return () => window.clearTimeout(id);
  }, [fetchProjects, q, sortCol, sortDir, perPage]);

  useEffect(() => {
    const st = loc.state as { openProjectCreate?: boolean } | undefined;
    if (st?.openProjectCreate) {
      setEditId(null);
      setForm({
        client_id: "",
        name: "",
        service_type: "",
        start_date: "",
        end_estimated: "",
        status: "pending",
        budget: "",
        lead_user_id: "",
        description: "",
        objectives: "",
        deliverables: "",
        area_ids: [],
        user_ids: [],
      });
      setOpen(true);
      navigate(loc.pathname, { replace: true, state: {} });
    }
  }, [loc.pathname, loc.state, navigate]);

  const toggleArea = (id: number) =>
    void setForm((f) => ({ ...f, area_ids: f.area_ids.includes(id) ? f.area_ids.filter((x) => x !== id) : [...f.area_ids, id] }));
  const toggleUser = (id: number) =>
    void setForm((f) => ({ ...f, user_ids: f.user_ids.includes(id) ? f.user_ids.filter((x) => x !== id) : [...f.user_ids, id] }));

  const onSortHeader = (col: ProjSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" || col === "client" || col === "start_date" ? "asc" : "desc");
    }
  };

  const sortState = (col: ProjSortCol): "asc" | "desc" | null => (sortCol === col ? sortDir : null);

  const openEdit = async (id: number) => {
    setModalErr(null);
    try {
      const p = await getJson<ProjRow>(`/api/projects/${id}`);
      setEditId(id);
      const aid = (p.areas ?? []).map((a) => a.id);
      setForm({
        client_id: typeof p.client_id === "number" ? p.client_id : "",
        name: p.name,
        service_type: p.service_type ?? "",
        start_date: p.start_date ?? "",
        end_estimated: p.end_estimated ?? "",
        status: p.status,
        budget: p.budget ?? "",
        lead_user_id: p.lead_user_id ?? "",
        description: p.description ?? "",
        objectives: p.objectives ?? "",
        deliverables: p.deliverables ?? "",
        area_ids: aid.length ? aid : [],
        user_ids: (p.users ?? []).map((u) => u.id),
      });
      setOpen(true);
    } catch (e: unknown) {
      setNotice({ variant: "error", title: "Proyecto", message: apiErrorMessage(e, "No se pudo cargar el proyecto.") });
    }
  };

  const save = async () => {
    setModalErr(null);
    if (!form.name.trim() || form.client_id === "" || form.area_ids.length === 0) {
      setModalErr("Nombre, cliente y al menos un área son obligatorios.");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        client_id: form.client_id,
        name: form.name,
        service_type: form.service_type || null,
        start_date: form.start_date || null,
        end_estimated: form.end_estimated || null,
        status: form.status,
        budget: form.budget ? Number(form.budget) : null,
        lead_user_id: form.lead_user_id === "" ? null : form.lead_user_id,
        description: form.description || null,
        objectives: form.objectives || null,
        deliverables: form.deliverables || null,
        area_ids: form.area_ids,
        user_ids: form.user_ids,
      };
      if (editId) await putJson(`/api/projects/${editId}`, body);
      else await postJson("/api/projects", body);
      setOpen(false);
      await fetchProjects(page);
      setNotice({
        variant: "success",
        title: editId ? "Proyecto actualizado" : "Proyecto creado",
        message: editId ? "Los cambios se guardaron." : "El proyecto quedó registrado en el portafolio.",
      });
      setEditId(null);
    } catch (e: unknown) {
      setNotice({
        variant: "error",
        title: "No se guardó",
        message: apiErrorMessage(e, "No se pudo guardar (verifique permisos por área)."),
      });
    }
  };

  const execCancelProj = async () => {
    if (!pendingCancel) return;
    const row = pendingCancel;
    const title = row.name;
    setPendingCancel(null);
    try {
      await deleteJson(`/api/projects/${row.id}`);
      await fetchProjects(page);
      setNotice({ variant: "success", title: "Proyecto cancelado / eliminado", message: `«${title}» fue dado de baja.` });
    } catch (e: unknown) {
      setNotice({ variant: "error", title: "Error", message: apiErrorMessage(e, "No se pudo completar la acción.") });
    }
  };

  const total = data?.total ?? 0;
  const lastPg = Math.max(1, data?.last_page ?? 1);

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Proyectos" }]} isLight={isLight} />
      <LabPageHeader
        title="Portafolio de proyectos"
        subtitle="Búsqueda, ordenamiento y paginación en servidor."
        isLight={isLight}
        action={
          <button type="button" className={labPrimaryBtn(isLight)} onClick={() => {setEditId(null); setModalErr(null); setOpen(true);}}>
            <FolderKanban className="h-4 w-4" /> Nuevo proyecto
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por proyecto, cliente o tipo de servicio…"
          className={["w-full sm:max-w-md", labInputClass(isLight)].join(" ")}
        />
      </div>

      <div className={labPanelClass(isLight)}>
        {!data ? (
          <p className="py-8 text-center text-sm text-zinc-500">Cargando…</p>
        ) : (
          <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
            <table
              className={[
                "w-full min-w-[760px] text-left text-sm",
                isLight ? "[&_tbody_tr:nth-child(even)]:bg-[#F9FAFB]/90" : "[&_tbody_tr:nth-child(even)]:bg-white/[0.02]",
              ].join(" ")}
            >
              <thead>
                <tr className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>
                  <LabSortableTh label="Proyecto" sorted={sortState("name")} isLight={isLight} onToggle={() => onSortHeader("name")} />
                  <LabSortableTh label="Cliente" sorted={sortState("client")} isLight={isLight} onToggle={() => onSortHeader("client")} />
                  <th className="pb-3 pr-3 text-left text-xs font-semibold uppercase tracking-wide">Áreas</th>
                  <LabSortableTh label="Estado" sorted={sortState("status")} isLight={isLight} onToggle={() => onSortHeader("status")} />
                  <LabSortableTh
                    label="Inicio"
                    sorted={sortState("start_date")}
                    isLight={isLight}
                    onToggle={() => onSortHeader("start_date")}
                    className="w-28 whitespace-nowrap"
                  />
                  <LabSortableTh
                    label="Alta"
                    sorted={sortState("created_at")}
                    isLight={isLight}
                    onToggle={() => onSortHeader("created_at")}
                    className="w-28 whitespace-nowrap"
                  />
                  <LabSortableTh label="ID" sorted={sortState("id")} isLight={isLight} onToggle={() => onSortHeader("id")} className="w-16" align="right" />
                  <th className="w-[6.5rem] pb-3 text-right text-xs font-semibold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((p) => (
                  <tr key={p.id} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                    <td className={"py-2.5 pr-4 font-semibold " + (isLight ? "text-[#111827]" : "text-white")}>{p.name}</td>
                    <td className="py-2.5 pr-4 text-xs">{p.client?.legal_name ?? "—"}</td>
                    <td className="py-2.5 pr-4 text-xs">{(p.areas ?? []).map((x) => x.name).join(", ")}</td>
                    <td className="py-2.5 pr-4 text-xs uppercase">{p.status}</td>
                    <td className="py-2.5 pr-4 text-xs whitespace-nowrap">{p.start_date ? String(p.start_date).slice(0, 10) : "—"}</td>
                    <td className="py-2.5 pr-4 text-xs whitespace-nowrap">{p.created_at ? String(p.created_at).slice(0, 10) : "—"}</td>
                    <td className="py-2.5 text-right text-xs tabular-nums">{p.id}</td>
                    <td className="py-2.5 text-right align-middle">
                      <div className="flex justify-end gap-2">
                        <LabCircleIconAction variant="edit" tooltip="Editar" ariaLabel={`Editar ${p.name}`} onClick={() => void openEdit(p.id)} />
                        {typeof p.client_id === "number" ? (
                          <span className="group relative inline-flex">
                            <Link
                              title="Cliente CRM"
                              to={`/clientes/${p.client_id}`}
                              className={[circleRowActionClass("link"), "inline-flex items-center justify-center"].join(" ")}
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-white" strokeWidth={2.25} aria-hidden />
                              <span className="sr-only">Cliente CRM</span>
                            </Link>
                            <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-40 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium leading-tight text-white shadow-lg ring-1 ring-black/40 group-hover:block">
                              Cliente CRM
                            </span>
                          </span>
                        ) : null}
                        <LabCircleIconAction variant="cancel" tooltip="Eliminar proyecto" ariaLabel={`Eliminar ${p.name}`} onClick={() => setPendingCancel(p)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data ? (
          <LabDataPager
            page={data.current_page}
            lastPage={lastPg}
            total={total}
            perPage={data.per_page}
            isLight={isLight}
            onPerPageChange={(pp) => {
              setPerPage(pp);
            }}
            onPageChange={(pn) =>
              void fetchProjects(pn).catch((e: unknown) => {
                setNotice({ variant: "error", title: "Paginación", message: apiErrorMessage(e, "No se pudieron cargar más filas.") });
              })
            }
          />
        ) : null}
      </div>

      <LabNoticeModal
        open={notice !== null}
        variant={notice?.variant ?? "success"}
        title={notice?.title ?? ""}
        message={notice?.message ?? ""}
        isLight={isLight}
        onClose={() => setNotice(null)}
      />

      <ConfirmModal
        open={pendingCancel !== null}
        title="Eliminar proyecto"
        message={pendingCancel ? `¿Confirma eliminar «${pendingCancel.name}»? Esta acción no puede deshacerse.` : ""}
        confirmText="Eliminar"
        danger
        isLight={isLight}
        onConfirm={() => void execCancelProj()}
        onCancel={() => setPendingCancel(null)}
      />

      <FormModal
        open={open}
        title={editId ? "Editar proyecto" : "Nuevo proyecto"}
        isLight={isLight}
        wide
        onClose={() => {setOpen(false); setModalErr(null);}}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => setOpen(false)}>
              Cerrar
            </button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void save()}>
              Guardar
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <LabField label="Cliente *" isLight={isLight} className="sm:col-span-2">
            <select
              className={labInputClass(isLight)}
              value={form.client_id === "" ? "" : String(form.client_id)}
              onChange={(e) => setForm({ ...form, client_id: e.target.value ? Number(e.target.value) : "" })}
            >
              <option value="">Seleccionar…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name}
                </option>
              ))}
            </select>
          </LabField>
          <LabField label="Nombre *" isLight={isLight} className="sm:col-span-2">
            <input className={labInputClass(isLight)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </LabField>
          <LabField label="Tipo de servicio" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} />
          </LabField>
          <LabField label="Estado" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="pending">Pendiente</option>
              <option value="in_progress">En proceso</option>
              <option value="paused">Pausado</option>
              <option value="finished">Finalizado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </LabField>
          <LabField label="Inicio" isLight={isLight}>
            <input type="date" className={labInputClass(isLight)} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </LabField>
          <LabField label="Fin estimado" isLight={isLight}>
            <input type="date" className={labInputClass(isLight)} value={form.end_estimated} onChange={(e) => setForm({ ...form, end_estimated: e.target.value })} />
          </LabField>
          <LabField label="Presupuesto" isLight={isLight}>
            <input type="number" step="0.01" className={labInputClass(isLight)} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </LabField>
          <LabField label="Responsable" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.lead_user_id === "" ? "" : String(form.lead_user_id)} onChange={(e) => setForm({ ...form, lead_user_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </LabField>
          <LabField label="Descripción" isLight={isLight} className="sm:col-span-2">
            <textarea rows={3} className={labInputClass(isLight)} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </LabField>
          <LabField label="Objetivos" isLight={isLight} className="sm:col-span-2">
            <textarea rows={2} className={labInputClass(isLight)} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
          </LabField>
          <LabField label="Entregables" isLight={isLight} className="sm:col-span-2">
            <textarea rows={2} className={labInputClass(isLight)} value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} />
          </LabField>
          <LabField label="Áreas *" isLight={isLight} className="sm:col-span-2">
            <div className={["flex flex-wrap gap-2 rounded-lg border p-3 text-xs", isLight ? "border-[#E5E7EB] bg-[#F9FAFB]" : "border-white/[0.06] bg-[#0a0a0a]/60"].join(" ")}>
              {areas.map((a) => (
                <label key={a.id} className={(isLight ? "text-[#374151]" : "text-zinc-200") + " flex gap-2"}>
                  <input type="checkbox" checked={form.area_ids.includes(a.id)} onChange={() => toggleArea(a.id)} /> {a.name}
                </label>
              ))}
            </div>
          </LabField>
          <LabField label="Equipo asignado" isLight={isLight} className="sm:col-span-2">
            <div className={["max-h-36 flex flex-wrap gap-2 overflow-y-auto rounded-lg border p-3 text-xs", isLight ? "border-[#E5E7EB]" : "border-white/[0.08]"].join(" ")}>
              {users.map((u) => (
                <label key={u.id} className={(isLight ? "text-[#374151]" : "text-zinc-200") + " flex gap-2"}>
                  <input type="checkbox" checked={form.user_ids.includes(u.id)} onChange={() => toggleUser(u.id)} /> {u.name}
                </label>
              ))}
            </div>
          </LabField>
          {modalErr ? <p className="sm:col-span-2 text-sm text-red-600">{modalErr}</p> : null}
        </div>
      </FormModal>
    </main>
  );
}
