import { Briefcase, Layers, Radar, TrendingUp, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FormModal } from "../xpande/FormModal";
import { deleteJson, getJson, postJson, putJson, type LaravelPaginated } from "../xpande/http";
import {
  LabBreadcrumbs,
  LabField,
  LabPageHeader,
  labCrudMainClass,
  labGhostBtn,
  labInputClass,
  labPanelClass,
  labPrimaryBtn,
  labStatusPill,
} from "../xpande/XpandeUi";
import { useApexTheme } from "../context/ThemeContext";

type AreaRow = { id: number; name: string; slug: string; is_active?: boolean };

export function AreasPage() {
  const { isLight } = useApexTheme();
  const [rows, setRows] = useState<AreaRow[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AreaRow | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", is_active: true });
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    void getJson<AreaRow[]>("/api/areas", { active_only: false }).then(setRows).catch(() => setErr("Error al cargar áreas."));

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setErr(null);
    try {
      if (edit) await putJson(`/api/areas/${edit.id}`, form);
      else await postJson("/api/areas", form);
      setOpen(false);
      setEdit(null);
      load();
    } catch {
      setErr("Sin permiso o datos inválidos.");
    }
  };

  const disable = async (a: AreaRow) => {
    if (!confirm("¿Desactivar área " + a.name + "?")) return;
    await deleteJson(`/api/areas/${a.id}`);
    load();
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs isLight={isLight} items={[{ label: "Dashboard", to: "/" }, { label: "Áreas" }]} />
      <LabPageHeader
        title="Áreas de negocio"
        subtitle="Xingeria, Xpande y Xango — control centralizado desde administración."
        isLight={isLight}
        action={
          <button type="button" className={labPrimaryBtn(isLight)} onClick={() => {setEdit(null); setForm({ name: "", slug: "", description: "", is_active: true }); setOpen(true);}}>
            <Layers className="h-4 w-4" />
            Nueva área
          </button>
        }
      />
      {err ? <p className="mb-4 text-sm text-red-500">{err}</p> : null}
      <div className={labPanelClass(isLight)}>
        <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>
                <th className="pb-3 pr-3 uppercase text-[10px] font-semibold">Nombre</th>
                <th className="pb-3 pr-3 uppercase text-[10px] font-semibold">Slug</th>
                <th className="pb-3 text-right uppercase text-[10px] font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={isLight ? "border-t border-[#F3F4F6]" : "border-t border-white/[0.06]"}>
                  <td className={"py-2 pr-3 font-medium " + (isLight ? "text-[#111827]" : "text-zinc-100")}>{r.name}</td>
                  <td className="py-2 pr-3">{r.slug}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className={labGhostBtn(isLight)}
                      onClick={() => {
                        setEdit(r);
                        setForm({
                          name: r.name,
                          slug: r.slug,
                          description: typeof (r as { description?: unknown }).description === "string" ? String((r as { description?: string }).description) : "",
                          is_active: r.is_active ?? true,
                        });
                        setOpen(true);
                      }}
                    >
                      Editar
                    </button>{" "}
                    <button type="button" className={labGhostBtn(isLight)} onClick={() => void disable(r)}>
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FormModal
        open={open}
        title={edit ? "Editar área" : "Nueva área"}
        isLight={isLight}
        onClose={() => setOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void save()}>
              Guardar
            </button>
          </div>
        }
      >
        <div className="grid gap-3">
          <LabField label="Nombre" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </LabField>
          <LabField label="Slug" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </LabField>
          <LabField label="Descripción" isLight={isLight}>
            <textarea className={labInputClass(isLight)} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </LabField>
        </div>
      </FormModal>
    </main>
  );
}

type ClientLite = {
  id: number;
  legal_name: string;
  trade_name?: string | null;
  pipeline_stage: string;
  areas?: AreaRow[];
};

export function ClientsPage() {
  const { isLight } = useApexTheme();
  const [data, setData] = useState<LaravelPaginated<ClientLite> | null>(null);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [searchingRuc, setSearchingRuc] = useState(false);
  const [form, setForm] = useState({
    legal_name: "",
    trade_name: "",
    ruc: "",
    address: "",
    pipeline_stage: "lead",
    area_ids: [] as number[],
  });
  const [err, setErr] = useState<string | null>(null);

  const load = async (page = 1) => {
    const r = await getJson<LaravelPaginated<ClientLite>>("/api/clients", { page });
    setData(r);
  };

  useEffect(() => {
    void load();
    void getJson<AreaRow[]>("/api/areas", { active_only: false }).then(setAreas);
  }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ legal_name: "", trade_name: "", ruc: "", address: "", pipeline_stage: "lead", area_ids: [] });
    setErr(null);
    setModal(true);
  };

  const openEditClient = async (c: ClientLite) => {
    setErr(null);
    try {
      const full = await getJson<{ legal_name?: string; trade_name?: string | null; ruc?: string | null; address?: string | null; pipeline_stage?: string; areas?: { id: number }[] }>(`/api/clients/${c.id}`);
      const aids = (full.areas ?? []).map((a) => a.id);
      setForm({
        legal_name: full.legal_name ?? c.legal_name,
        trade_name: full.trade_name ?? "",
        ruc: full.ruc ?? "",
        address: full.address ?? "",
        pipeline_stage: full.pipeline_stage ?? c.pipeline_stage,
        area_ids: aids.length ? aids : (c.areas ?? []).map((a) => a.id),
      });
      setEditId(c.id);
      setModal(true);
    } catch {
      setErr("No se pudo cargar cliente.");
    }
  };

  const deactivateClient = async (c: ClientLite) => {
    if (!confirm("¿Dar de baja a " + c.legal_name + "?")) return;
    try {
      await deleteJson(`/api/clients/${c.id}`);
      await load(data?.current_page ?? 1);
    } catch {
      setErr("No se pudo desactivar.");
    }
  };

  const save = async () => {
    setErr(null);
    try {
      if (form.area_ids.length === 0) {
        setErr("Seleccione al menos un área.");
        return;
      }
      if (editId) await putJson(`/api/clients/${editId}`, { ...form });
      else await postJson("/api/clients", form);
      setModal(false);
      setEditId(null);
      await load(data?.current_page ?? 1);
      setForm({ legal_name: "", trade_name: "", ruc: "", address: "", pipeline_stage: "lead", area_ids: [] });
    } catch {
      setErr("No se pudo guardar.");
    }
  };

  const toggle = (id: number) =>
    void setForm((f) => ({ ...f, area_ids: f.area_ids.includes(id) ? f.area_ids.filter((x) => x !== id) : [...f.area_ids, id] }));

  const performRucSearch = async () => {
    if (!form.ruc || form.ruc.length !== 11) {
      setErr("Ingrese un RUC válido de 11 dígitos.");
      return;
    }
    setSearchingRuc(true);
    setErr(null);
    try {
      const res = await getJson<any>(`/api/clients/search-ruc/${form.ruc}`);
      const info = res?.resultado ?? res?.data ?? res;
      if (info && info.razon_social) {
        setForm((f) => ({
          ...f,
          legal_name: info.razon_social,
          trade_name: info.nombre_comercial && info.nombre_comercial !== "-" ? info.nombre_comercial : info.razon_social,
          address: info.direccion || f.address,
        }));
      } else {
        setErr("No se encontraron datos para ese RUC.");
      }
    } catch {
      setErr("Error al consultar el RUC.");
    } finally {
      setSearchingRuc(false);
    }
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs isLight={isLight} items={[{ label: "Dashboard", to: "/" }, { label: "Clientes CRM" }]} />
      <LabPageHeader
        title="Clientes"
        subtitle="Segmentación por pipeline, industrias y vínculos con Xingeria, Xpande y Xango."
        isLight={isLight}
        action={
          <button type="button" className={labPrimaryBtn(isLight)} onClick={openCreate}>
            <Briefcase className="h-4 w-4" /> Nuevo cliente
          </button>
        }
      />
      {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}
      <div className={labPanelClass(isLight)}>
        {!data ? (
          <p className="py-10 text-center text-sm text-zinc-500">Cargando…</p>
        ) : (
          <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>
                  <th className="pb-3 pr-3 uppercase text-[10px] font-semibold">Razón social</th>
                  <th className="pb-3 pr-3 uppercase text-[10px] font-semibold">Pipeline</th>
                  <th className="pb-3 pr-3 uppercase text-[10px] font-semibold">Áreas</th>
                  <th className="pb-3 text-right uppercase text-[10px] font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c) => (
                  <tr key={c.id} className={isLight ? "border-t border-[#F3F4F6]" : "border-t border-white/[0.06]"}>
                    <td className={"py-2 pr-3 font-medium " + (isLight ? "text-[#111827]" : "text-white")}>{c.legal_name}</td>
                    <td className="py-2 pr-3">{c.pipeline_stage}</td>
                    <td className="py-2 pr-3 text-xs">{(c.areas ?? []).map((a) => a.name).join(", ")}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button type="button" className={labGhostBtn(isLight)} onClick={() => void openEditClient(c)}>
                        Editar
                      </button>{" "}
                      <Link to={`/clientes/${c.id}`} className={labGhostBtn(isLight)}>
                        CRM
                      </Link>{" "}
                      <button type="button" className={labGhostBtn(isLight)} onClick={() => void deactivateClient(c)}>
                        Baja
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormModal
        open={modal}
        title={editId ? "Editar cliente" : "Registrar cliente"}
        isLight={isLight}
        onClose={() => {setModal(false); setEditId(null); setErr(null);}}
        wide
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => {setModal(false); setEditId(null);}}>
              Cerrar
            </button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void save()}>
              Guardar
            </button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <LabField label="Razón social" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          </LabField>
          <LabField label="Nombre comercial" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
          </LabField>
          <LabField label="RUC" isLight={isLight}>
            <div className="flex gap-2">
              <input className={labInputClass(isLight) + " flex-1"} value={form.ruc} onChange={(e) => setForm({ ...form, ruc: e.target.value })} />
              <button
                type="button"
                onClick={performRucSearch}
                disabled={searchingRuc}
                className={labPrimaryBtn(isLight) + " flex items-center justify-center px-3"}
                title="Buscar RUC"
              >
                {searchingRuc ? (
                  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            </div>
          </LabField>
          <LabField label="Dirección" isLight={isLight}>
            <input className={labInputClass(isLight)} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </LabField>
          <LabField label="Etapa CRM" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.pipeline_stage} onChange={(e) => setForm({ ...form, pipeline_stage: e.target.value })}>
              <option value="lead">Lead</option>
              <option value="prospect">Prospecto</option>
              <option value="client">Cliente</option>
              <option value="active_client">Cliente activo</option>
              <option value="inactive_client">Cliente inactivo</option>
            </select>
          </LabField>
          <LabField label="Áreas relacionadas" isLight={isLight} className="sm:col-span-2">
            <div className={["flex flex-wrap gap-2 rounded-lg border p-3 text-xs font-medium", isLight ? "border-[#E5E7EB] bg-[#F9FAFB]" : "border-white/[0.06] bg-[#0a0a0a]/60"].join(" ")}>
              {areas.map((a) => (
                <label key={a.id} className={"flex gap-2 " + (isLight ? "text-[#374151]" : "text-zinc-200")}>
                  <input type="checkbox" checked={form.area_ids.includes(a.id)} onChange={() => toggle(a.id)} /> {a.name}
                </label>
              ))}
            </div>
          </LabField>
        </div>
      </FormModal>
    </main>
  );
}

type CrmContact = { id: number; name: string; position?: string | null; phone?: string | null; email?: string | null };
type CrmActivity = { id: number; type: string; subject?: string | null };

export function ClientDetailPage() {
  const { id } = useParams();
  const cid = Number(id);
  const { isLight } = useApexTheme();
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [contactModal, setContactModal] = useState(false);
  const [activityModal, setActivityModal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cf, setCf] = useState({ name: "", position: "", phone: "", email: "" });
  const [af, setAf] = useState({ type: "call", subject: "", body: "", occurred_at: "", next_followup_at: "" });

  const reload = () => void getJson<Record<string, unknown>>(`/api/clients/${cid}`).then(setRow);

  useEffect(() => {
    reload();
  }, [cid]);

  if (!row) return <main className={labCrudMainClass(isLight)}><p className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>Cargando ficha CRM…</p></main>;

  const asRec = row as Record<string, unknown>;
  const contacts = Array.isArray(asRec.contacts) ? (asRec.contacts as CrmContact[]) : [];
  const activities =
    ((asRec.crm_activities as CrmActivity[]) ?? (asRec.crmActivities as CrmActivity[]) ?? []);

  const saveContact = async () => {
    setErr(null);
    if (!cf.name.trim()) {
      setErr("Nombre del contacto requerido.");
      return;
    }
    try {
      await postJson(`/api/clients/${cid}/contacts`, {
        name: cf.name.trim(),
        position: cf.position.trim() || null,
        phone: cf.phone.trim() || null,
        email: cf.email.trim() || null,
      });
      setContactModal(false);
      setCf({ name: "", position: "", phone: "", email: "" });
      reload();
    } catch {
      setErr("No se pudo guardar contacto.");
    }
  };

  const saveActivity = async () => {
    setErr(null);
    if (!af.type.trim()) {
      setErr("Tipo requerido.");
      return;
    }
    try {
      await postJson(`/api/clients/${cid}/crm-activities`, {
        type: af.type.trim(),
        subject: af.subject.trim() || null,
        body: af.body.trim() || null,
        occurred_at: af.occurred_at || null,
        next_followup_at: af.next_followup_at || null,
      });
      setActivityModal(false);
      setAf({ type: "call", subject: "", body: "", occurred_at: "", next_followup_at: "" });
      reload();
    } catch {
      setErr("No se pudo registrar actividad.");
    }
  };

  const delContact = async (contactId: number) => {
    if (!confirm("¿Eliminar contacto?")) return;
    try {
      await deleteJson(`/api/clients/${cid}/contacts/${contactId}`);
      reload();
    } catch {
      setErr("No se pudo eliminar.");
    }
  };

  const delActivity = async (activityId: number) => {
    if (!confirm("¿Eliminar actividad?")) return;
    try {
      await deleteJson(`/api/clients/${cid}/crm-activities/${activityId}`);
      reload();
    } catch {
      setErr("No se pudo eliminar.");
    }
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs isLight={isLight} items={[{ label: "Dashboard", to: "/" }, { label: "Clientes", to: "/clientes" }, { label: String(row.legal_name) }]} />
      <LabPageHeader
        title={String(row.legal_name)}
        subtitle="Comercial CRM · Contactos · Actividades"
        isLight={isLight}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => {setErr(null); setContactModal(true);}}>
              + Contacto
            </button>
            <button type="button" className={labGhostBtn(isLight)} onClick={() => {setErr(null); setActivityModal(true);}}>
              + Actividad
            </button>
          </div>
        }
      />
      {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={labPanelClass(isLight)}>
          <h3 className={"mb-2 text-sm font-semibold " + (isLight ? "text-[#111827]" : "text-zinc-100")}>Contactos</h3>
          <ul className="space-y-3 text-sm">
            {contacts.map((co) => (
              <li key={co.id} className={isLight ? "text-[#374151]" : "text-zinc-300"}>
                <div className="font-medium">{co.name}</div>
                <div className="text-[11px] text-zinc-500">{co.position ?? ""} {co.phone ? "· " + co.phone : ""} {co.email ? "· " + co.email : ""}</div>
                <button type="button" className={"mt-1 " + labGhostBtn(isLight)} onClick={() => void delContact(co.id)}>
                  Eliminar
                </button>
              </li>
            ))}
            {!contacts.length ? <li className="text-zinc-500">Sin contactos cargados.</li> : null}
          </ul>
        </section>
        <section className={labPanelClass(isLight)}>
          <h3 className={"mb-2 text-sm font-semibold " + (isLight ? "text-[#111827]" : "text-zinc-100")}>Últimos movimientos</h3>
          <ul className="space-y-2 text-xs">
            {activities.slice(0, 20).map((a) => (
              <li key={a.id} className={(isLight ? "text-[#374151]" : "text-zinc-300") + " flex flex-wrap items-center justify-between gap-2"}>
                <span>
                  <span className={labStatusPill("neutral", isLight)}>{a.type}</span> {a.subject ?? ""}
                </span>
                <button type="button" className={labGhostBtn(isLight)} onClick={() => void delActivity(a.id)}>
                  Eliminar
                </button>
              </li>
            ))}
            {!activities.length ? <li className="text-zinc-500">Registre actividades de seguimiento.</li> : null}
          </ul>
        </section>
      </div>

      <FormModal
        open={contactModal}
        title="Nuevo contacto"
        isLight={isLight}
        onClose={() => {setContactModal(false); setErr(null);}}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => setContactModal(false)}>Cerrar</button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void saveContact()}>Guardar</button>
          </div>
        }
      >
        <div className="grid gap-3">
          <LabField label="Nombre *" isLight={isLight}><input className={labInputClass(isLight)} value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} /></LabField>
          <LabField label="Cargo" isLight={isLight}><input className={labInputClass(isLight)} value={cf.position} onChange={(e) => setCf({ ...cf, position: e.target.value })} /></LabField>
          <LabField label="Teléfono" isLight={isLight}><input className={labInputClass(isLight)} value={cf.phone} onChange={(e) => setCf({ ...cf, phone: e.target.value })} /></LabField>
          <LabField label="Email" isLight={isLight}><input className={labInputClass(isLight)} value={cf.email} onChange={(e) => setCf({ ...cf, email: e.target.value })} /></LabField>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </FormModal>

      <FormModal
        open={activityModal}
        title="Registrar actividad CRM"
        isLight={isLight}
        wide
        onClose={() => {setActivityModal(false); setErr(null);}}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => setActivityModal(false)}>Cerrar</button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void saveActivity()}>Registrar</button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <LabField label="Tipo *" isLight={isLight}>
            <select className={labInputClass(isLight)} value={af.type} onChange={(e) => setAf({ ...af, type: e.target.value })}>
              <option value="call">Llamada</option>
              <option value="meeting">Reunión</option>
              <option value="email">Email</option>
              <option value="visit">Visita</option>
              <option value="note">Nota</option>
            </select>
          </LabField>
          <LabField label="Asunto" isLight={isLight}>
            <input className={labInputClass(isLight)} value={af.subject} onChange={(e) => setAf({ ...af, subject: e.target.value })} />
          </LabField>
          <LabField label="Fecha ocurrida" isLight={isLight}>
            <input type="datetime-local" className={labInputClass(isLight)} value={af.occurred_at} onChange={(e) => setAf({ ...af, occurred_at: e.target.value })} />
          </LabField>
          <LabField label="Próximo seguimiento" isLight={isLight}>
            <input type="datetime-local" className={labInputClass(isLight)} value={af.next_followup_at} onChange={(e) => setAf({ ...af, next_followup_at: e.target.value })} />
          </LabField>
          <LabField label="Detalle" isLight={isLight} className="sm:col-span-2">
            <textarea className={labInputClass(isLight)} rows={3} value={af.body} onChange={(e) => setAf({ ...af, body: e.target.value })} />
          </LabField>
          {err ? <p className="sm:col-span-2 text-sm text-red-600">{err}</p> : null}
        </div>
      </FormModal>
    </main>
  );
}

function fmtSolReport(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return "—";
  return (
    "S/. " +
    n.toLocaleString("es-PE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function RentabilidadPage() {
  const { isLight } = useApexTheme();
  const [scope, setScope] = useState<"p" | "c" | "a" | "work">("p");
  const [json, setJson] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const path =
      scope === "p"
        ? "/api/reports/profitability-projects"
        : scope === "c"
          ? "/api/reports/profitability-clients"
          : scope === "a"
            ? "/api/reports/profitability-areas"
            : "/api/reports/consultant-workload";
    void getJson<Record<string, unknown>>(path).then(setJson);
  }, [scope]);

  const th = "pb-2 pr-2 text-[10px] font-semibold uppercase " + (isLight ? "text-[#6B7280]" : "text-zinc-500");
  const td = "py-2 pr-2 text-xs align-top " + (isLight ? "text-[#111827]" : "text-zinc-200");

  const formula = typeof json?.formula === "string" ? json.formula : null;

  const renderProjects = () => {
    const data = Array.isArray(json?.data) ? (json!.data as Record<string, unknown>[]) : [];
    return (
      <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr>
              <th className={th}>ID</th>
              <th className={th}>Proyecto</th>
              <th className={th}>Cliente</th>
              <th className={th + " text-right"}>Ingresos</th>
              <th className={th + " text-right"}>Gastos dir.</th>
              <th className={th + " text-right"}>Costo hh</th>
              <th className={th + " text-right"}>Utilidad</th>
              <th className={th + " text-right"}>% margen</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={Number(r.project_id)} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                <td className={td}>{String(r.project_id)}</td>
                <td className={td + " font-medium"}>
                  <Link to={`/proyectos`} className={isLight ? "text-[#007BFF] hover:underline" : "text-[#7AB8FF] hover:underline"}>
                    {String(r.name)}
                  </Link>
                </td>
                <td className={td}>{String(r.client ?? "")}</td>
                <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.ingresos)}</td>
                <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.gastos_directos)}</td>
                <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.costo_horas_estimado)}</td>
                <td className={td + " text-right tabular-nums font-medium"}>{fmtSolReport(r.utilidad_neta_estimada)}</td>
                <td className={td + " text-right"}>{typeof r.margen_pct === "number" ? `${r.margen_pct}%` : String(r.margen_pct ?? "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length ? <p className="py-8 text-center text-sm text-zinc-500">No hay proyectos que mostrar para su alcance.</p> : null}
      </div>
    );
  };

  const renderClients = () => {
    const data = Array.isArray(json?.data) ? (json!.data as Record<string, unknown>[]) : [];
    return (
      <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr>
              <th className={th}>Cliente</th>
              <th className={th}>Áreas</th>
              <th className={th + " text-right"}>Ingresos</th>
              <th className={th + " text-right"}>Gastos decl.</th>
              <th className={th + " text-right"}>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => {
              const areas = Array.isArray(r.areas) ? (r.areas as string[]) : [];
              return (
                <tr key={Number(r.client_id)} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                  <td className={td + " font-medium"}>
                    <Link to={`/clientes/${String(r.client_id)}`} className={isLight ? "text-[#007BFF] hover:underline" : "text-[#7AB8FF] hover:underline"}>
                      {String(r.legal_name)}
                    </Link>
                  </td>
                  <td className={td + " text-[11px]"}>{areas.join(", ") || "—"}</td>
                  <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.ingresos)}</td>
                  <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.gastos_declarados)}</td>
                  <td className={td + " text-right tabular-nums font-medium"}>{fmtSolReport(r.utilidad)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!data.length ? <p className="py-8 text-center text-sm text-zinc-500">Sin datos por cliente.</p> : null}
      </div>
    );
  };

  const renderAreas = () => {
    const data = Array.isArray(json?.data) ? (json!.data as Record<string, unknown>[]) : [];
    return (
      <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr>
              <th className={th}>Área</th>
              <th className={th + " text-right"}>Ingresos</th>
              <th className={th + " text-right"}>Gastos</th>
              <th className={th + " text-right"}>Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={Number(r.area_id)} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                <td className={td + " font-medium"}>{String(r.area_name ?? r.area_id)}</td>
                <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.ingresos)}</td>
                <td className={td + " text-right tabular-nums"}>{fmtSolReport(r.gastos)}</td>
                <td className={td + " text-right tabular-nums font-medium"}>{fmtSolReport(r.utilidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length ? <p className="py-8 text-center text-sm text-zinc-500">Sin áreas disponibles para su usuario.</p> : null}
      </div>
    );
  };

  const renderWorkload = () => {
    const data = Array.isArray(json?.data) ? (json!.data as Record<string, unknown>[]) : [];
    return (
      <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
        <table className="w-full min-w-[360px] text-left">
          <thead>
            <tr>
              <th className={th}>Consultor</th>
              <th className={th + " text-right"}>Horas acumuladas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={Number(r.user_id)} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                <td className={td + " font-medium"}>{String(r.nombre ?? r.user_id)}</td>
                <td className={td + " text-right tabular-nums"}>{typeof r.total_horas === "number" ? r.total_horas.toFixed(2) : String(r.total_horas)} h</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length ? <p className="py-8 text-center text-sm text-zinc-500">Sin registros de tiempo en alcance.</p> : null}
      </div>
    );
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Rentabilidad & reportes avanzados" }]} isLight={isLight} />
      <LabPageHeader title="Rentabilidad" subtitle="ROI, márgenes, costo de horas y productividad de consultores calculados desde datos reales." isLight={isLight} />
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={scope === "p" ? labPrimaryBtn(isLight) : labGhostBtn(isLight)} onClick={() => setScope("p")}>
          <TrendingUp className="h-4 w-4" /> Por proyecto
        </button>
        <button type="button" className={scope === "c" ? labPrimaryBtn(isLight) : labGhostBtn(isLight)} onClick={() => setScope("c")}>
          Por cliente
        </button>
        <button type="button" className={scope === "a" ? labPrimaryBtn(isLight) : labGhostBtn(isLight)} onClick={() => setScope("a")}>
          Por área
        </button>
        <button type="button" className={scope === "work" ? labPrimaryBtn(isLight) : labGhostBtn(isLight)} onClick={() => setScope("work")}>
          <Radar className="h-4 w-4" /> Carga consultores
        </button>
      </div>
      <div className={labPanelClass(isLight)}>
        {formula ? <p className={"mb-4 text-[11px] leading-relaxed " + (isLight ? "text-[#6B7280]" : "text-zinc-500")}>{formula}</p> : null}
        {!json ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
        {json && scope === "p" ? renderProjects() : null}
        {json && scope === "c" ? renderClients() : null}
        {json && scope === "a" ? renderAreas() : null}
        {json && scope === "work" ? renderWorkload() : null}
      </div>
    </main>
  );
}

const INTEGRATION_LABELS: Record<string, string> = {
  sunat_electronic_billing: "Facturación electrónica SUNAT",
  excel_export: "Exportación Excel / CSV",
  pdf_export: "Exportación PDF",
  power_bi: "Power BI / analítica",
  email: "Correo transaccional",
  whatsapp: "WhatsApp Business",
  crm_externo: "CRM externo",
  google_drive: "Google Drive – copia documental",
};

export function IntegracionesPage() {
  const { isLight } = useApexTheme();
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => void getJson<Record<string, unknown>>("/api/integrations").then(setData), []);

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Integraciones" }]} isLight={isLight} />
      <LabPageHeader title="Roadmap de integraciones" subtitle="Estado de cada conector corporativo según configuración backend." isLight={isLight} />
      {!data ? (
        <p className="text-sm text-zinc-500">Consultando configuración…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(data).map(([key, raw]) => {
            const meta = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
            const estado = String(meta.estado ?? "—");
            const nota = String(meta.nota ?? "");
            const ok = estado === "disponible";
            return (
              <div key={key} className={labPanelClass(isLight)}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className={"text-sm font-semibold " + (isLight ? "text-[#111827]" : "text-zinc-100")}>{INTEGRATION_LABELS[key] ?? key}</h3>
                  <span className={labStatusPill(ok ? "ok" : "warn", isLight)}>
                    {ok ? "Disponible" : estado === "planificado" ? "Planificado" : estado}
                  </span>
                </div>
                <p className={"text-xs leading-relaxed " + (isLight ? "text-[#6B7280]" : "text-zinc-500")}>{nota}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

export function ReportesGerenciaPage() {
  const { isLight } = useApexTheme();
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => void getJson<Record<string, unknown>>("/api/reports/insights").then(setPayload), []);

  const period = payload && Array.isArray(payload.period) ? (payload.period as string[]) : null;
  const topClients =
    payload && Array.isArray(payload.top_clients)
      ? (payload.top_clients as { client_id: number; legal_name?: string; total?: number }[])
      : [];
  const cotPendientes = typeof payload?.cotizaciones_pendientes === "number" ? payload.cotizaciones_pendientes : 0;
  const th = "pb-2 pr-2 text-[10px] font-semibold uppercase " + (isLight ? "text-[#6B7280]" : "text-zinc-500");
  const td = "py-2 pr-2 text-xs " + (isLight ? "text-[#111827]" : "text-zinc-200");

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Reportes ejecutivos" }]} isLight={isLight} />
      <LabPageHeader title="Indicadores de gerencia" subtitle="Mes en curso: top ingresos por cliente y trabajo comercial pendiente." isLight={isLight} />
      {!payload ? (
        <p className="text-sm text-zinc-500">Cargando métricas…</p>
      ) : (
        <div className="space-y-4">
          {period && period.length >= 2 ? (
            <p className={"text-xs " + (isLight ? "text-[#6B7280]" : "text-zinc-500")}>
              Periodo analizado: {period[0]} — {period[1]}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className={labPanelClass(isLight)}>
              <p className={"text-[10px] font-semibold uppercase " + (isLight ? "text-[#6B7280]" : "text-zinc-500")}>Cotizaciones pendientes</p>
              <p className={"mt-1 text-2xl font-bold " + (isLight ? "text-[#111827]" : "text-white")}>{cotPendientes}</p>
              <p className={"mt-2 text-[11px] " + (isLight ? "text-[#6B7280]" : "text-zinc-500")}>Borrador + enviada (su alcance de áreas).</p>
              <Link to="/cotizaciones" className={"mt-3 inline-flex text-xs font-semibold " + (isLight ? "text-[#007BFF] hover:underline" : "text-[#7AB8FF] hover:underline")}>
                Ir a cotizaciones
              </Link>
            </div>
          </div>

          <div className={labPanelClass(isLight)}>
            <h3 className={"mb-3 text-sm font-semibold " + (isLight ? "text-[#111827]" : "text-zinc-100")}>Top clientes por ingresos (mes actual)</h3>
            <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
              <table className="w-full min-w-[400px] text-left">
                <thead>
                  <tr>
                    <th className={th}>Cliente</th>
                    <th className={th + " text-right"}>Ingreso acumulado</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((row) => (
                    <tr key={row.client_id} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                      <td className={td + " font-medium"}>{String(row.legal_name ?? "—")}</td>
                      <td className={td + " text-right tabular-nums"}>{fmtSolReport(row.total)}</td>
                      <td className={td}>
                        <Link to={`/clientes/${row.client_id}`} className={labGhostBtn(isLight)}>
                          CRM
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!topClients.length ? <p className="py-6 text-center text-sm text-zinc-500">Sin ingresos con cliente informado este mes.</p> : null}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
