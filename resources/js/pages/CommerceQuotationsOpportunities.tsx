import { FileSpreadsheet } from "lucide-react";
import { useEffect, useState } from "react";
import { FormModal } from "../xpande/FormModal";
import { deleteJson, getJson, postJson, putJson, type LaravelPaginated } from "../xpande/http";
import { LabBreadcrumbs, LabField, LabPageHeader, labCrudMainClass, labGhostBtn, labInputClass, labPanelClass, labPrimaryBtn } from "../xpande/XpandeUi";
import { useApexTheme } from "../context/ThemeContext";

type AreaOpt = { id: number; name: string };
type ClientOpt = { id: number; legal_name: string };
type CurrOpt = { id: number; code: string };
type CollabOpt = { id: number; name: string };

type QLineUI = { description: string; quantity: string; unit_price: string };

export function QuotationsPage() {
  const { isLight } = useApexTheme();
  const [rows, setRows] = useState<LaravelPaginated<Record<string, unknown>> | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [currencies, setCurrencies] = useState<CurrOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [acceptId, setAcceptId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: "" as "" | number,
    status: "draft",
    currency_id: "" as "" | number,
    tax_amount: "0",
    discount: "0",
    valid_until: "",
    notes: "",
    area_ids: [] as number[],
    lines: [{ description: "", quantity: "1", unit_price: "" }] as QLineUI[],
  });
  const [acceptForm, setAcceptForm] = useState({ project_name: "", service_type: "" });

  const load = () =>
    void getJson<LaravelPaginated<Record<string, unknown>>>("/api/quotations").then(setRows);

  useEffect(() => {
    load();
    void getJson<LaravelPaginated<ClientOpt>>("/api/clients", { per_page: 120 }).then((r) => setClients(r.data));
    void getJson<AreaOpt[]>("/api/areas", { active_only: false }).then(setAreas);
    void getJson<CurrOpt[]>("/api/catalog/currencies").then(setCurrencies);
  }, []);

  const resetForm = () => {
    setForm({
      client_id: "",
      status: "draft",
      currency_id: "",
      tax_amount: "0",
      discount: "0",
      valid_until: "",
      notes: "",
      area_ids: [],
      lines: [{ description: "", quantity: "1", unit_price: "" }],
    });
    setEditId(null);
    setErr(null);
  };

  const toggleArea = (id: number) =>
    void setForm((f) => ({
      ...f,
      area_ids: f.area_ids.includes(id) ? f.area_ids.filter((x) => x !== id) : [...f.area_ids, id],
    }));

  const loadEdit = async (id: number) => {
    setErr(null);
    try {
      const q = await getJson<Record<string, unknown>>(`/api/quotations/${id}`);
      const linesRaw = Array.isArray(q.lines) ? (q.lines as Record<string, unknown>[]) : [];
      const lids = ((q.areas as { id: number }[]) ?? []).map((a) => a.id);
      setEditId(id);
      setForm({
        client_id: typeof q.client_id === "number" ? q.client_id : "",
        status: String(q.status ?? "draft"),
        currency_id: typeof q.currency_id === "number" ? q.currency_id : "",
        tax_amount: String(q.tax_amount ?? "0"),
        discount: String(q.discount ?? "0"),
        valid_until: typeof q.valid_until === "string" ? q.valid_until.slice(0, 10) : "",
        notes: String(q.notes ?? ""),
        area_ids: lids,
        lines:
          linesRaw.length > 0
            ? linesRaw.map((l) => ({
                description: String(l.description ?? ""),
                quantity: String(l.quantity ?? "1"),
                unit_price: String(l.unit_price ?? ""),
              }))
            : [{ description: "", quantity: "1", unit_price: "" }],
      });
      setOpen(true);
    } catch {
      setErr("No se pudo cargar la cotización.");
    }
  };

  const save = async () => {
    setErr(null);
    if (form.client_id === "" || form.area_ids.length === 0) {
      setErr("Cliente y al menos un área son obligatorios.");
      return;
    }
    const lines = form.lines
      .filter((l) => l.description.trim())
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
      }));
    if (lines.length === 0) {
      setErr("Agregue al menos una línea con concepto.");
      return;
    }
    try {
      const body: Record<string, unknown> = {
        client_id: form.client_id,
        status: form.status,
        tax_amount: Number(form.tax_amount) || 0,
        discount: Number(form.discount) || 0,
        currency_id: form.currency_id === "" ? null : form.currency_id,
        valid_until: form.valid_until || null,
        notes: form.notes || null,
        area_ids: form.area_ids,
        lines,
      };
      if (editId) {
        delete body.client_id;
        await putJson(`/api/quotations/${editId}`, body);
      } else await postJson("/api/quotations", body);
      setOpen(false);
      resetForm();
      load();
    } catch {
      setErr("Error al guardar (revise alcance por áreas y datos).");
    }
  };

  const rejectQuote = async (id: number) => {
    if (!confirm("¿Marcar cotización como rechazada?")) return;
    try {
      await deleteJson(`/api/quotations/${id}`);
      load();
    } catch {
      setErr("No se pudo rechazar.");
    }
  };

  const doAccept = async () => {
    if (!acceptId) return;
    setErr(null);
    try {
      await postJson(`/api/quotations/${acceptId}/accept`, {
        project_name: acceptForm.project_name || undefined,
        service_type: acceptForm.service_type || undefined,
      });
      setAcceptId(null);
      load();
    } catch {
      setErr("No se pudo aceptar y generar proyecto.");
    }
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Cotizaciones" }]} isLight={isLight} />
      <LabPageHeader
        title="Cotizaciones"
        subtitle="Creación por cliente, líneas editables y conversión a proyecto al aceptar."
        isLight={isLight}
        action={
          <button type="button" className={labPrimaryBtn(isLight)} onClick={() => {resetForm(); setOpen(true);}}>
            <FileSpreadsheet className="h-4 w-4" /> Nueva cotización
          </button>
        }
      />
      {err && !open && !acceptId ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}

      <div className={labPanelClass(isLight)}>
        {!rows ? (
          <p className="py-8 text-center text-sm text-zinc-500">Cargando…</p>
        ) : (
          <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>
                  <th className="pb-3 pr-3 text-[10px] font-semibold uppercase">Número</th>
                  <th className="pb-3 pr-3 text-[10px] font-semibold uppercase">Cliente</th>
                  <th className="pb-3 pr-3 text-[10px] font-semibold uppercase">Estado</th>
                  <th className="pb-3 pr-3 text-right text-[10px] font-semibold uppercase">Total</th>
                  <th className="pb-3 text-right text-[10px] font-semibold uppercase" />
                </tr>
              </thead>
              <tbody>
                {rows.data.map((q: Record<string, unknown>) => {
                  const c = q.client as { legal_name?: string } | undefined;
                  const st = String(q.status ?? "");
                  return (
                    <tr key={Number(q.id)} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                      <td className="py-2 pr-3 font-mono text-xs">{String(q.number)}</td>
                      <td className="py-2 pr-3 text-xs">{c?.legal_name ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs capitalize">{st}</td>
                      <td className="py-2 pr-3 text-right text-xs">S/. {String(q.total ?? "")}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button type="button" className={labGhostBtn(isLight)} onClick={() => void loadEdit(Number(q.id))}>
                          Editar
                        </button>{" "}
                        {st !== "accepted" && st !== "rejected" ? (
                          <>
                            <button
                              type="button"
                              className={labGhostBtn(isLight)}
                              onClick={() => {
                                setAcceptId(Number(q.id));
                                setAcceptForm({ project_name: "", service_type: "" });
                                setErr(null);
                              }}
                            >
                              Aceptar
                            </button>{" "}
                            <button type="button" className={labGhostBtn(isLight)} onClick={() => void rejectQuote(Number(q.id))}>
                              Rechazar
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormModal
        open={open}
        title={editId ? "Editar cotización" : "Nueva cotización"}
        isLight={isLight}
        wide
        onClose={() => {setOpen(false); resetForm();}}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => {setOpen(false); resetForm();}}>
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
              disabled={editId !== null}
              className={labInputClass(isLight)}
              value={form.client_id === "" ? "" : String(form.client_id)}
              onChange={(e) => setForm({ ...form, client_id: e.target.value ? Number(e.target.value) : "" })}
            >
              <option value="">Seleccionar…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>
          </LabField>
          <LabField label="Estado" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Borrador</option>
              <option value="sent">Enviada</option>
            </select>
          </LabField>
          <LabField label="Moneda" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.currency_id === "" ? "" : String(form.currency_id)} onChange={(e) => setForm({ ...form, currency_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">Sin moneda específica</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </select>
          </LabField>
          <LabField label="Válido hasta" isLight={isLight}>
            <input type="date" className={labInputClass(isLight)} value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          </LabField>
          <LabField label="IGV / impuesto" isLight={isLight}>
            <input type="number" step="0.01" className={labInputClass(isLight)} value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
          </LabField>
          <LabField label="Descuento" isLight={isLight}>
            <input type="number" step="0.01" className={labInputClass(isLight)} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </LabField>
          <LabField label="Notas" isLight={isLight} className="sm:col-span-2">
            <textarea className={labInputClass(isLight)} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
          <LabField label="Líneas *" isLight={isLight} className="sm:col-span-2">
            <div className="space-y-2">
              {form.lines.map((ln, idx) => (
                <div key={idx} className={["grid gap-2 rounded-lg border p-2 sm:grid-cols-12", isLight ? "border-[#E5E7EB]" : "border-white/[0.08]"].join(" ")}>
                  <input className={labInputClass(isLight) + " sm:col-span-6"} placeholder="Concepto" value={ln.description} onChange={(e) => void setForm((f) => {
                    const n = [...f.lines];
                    n[idx] = { ...n[idx]!, description: e.target.value };
                    return { ...f, lines: n };
                  })} />
                  <input type="number" className={labInputClass(isLight) + " sm:col-span-2"} placeholder="Cant." value={ln.quantity} onChange={(e) => void setForm((f) => {
                    const n = [...f.lines];
                    n[idx] = { ...n[idx]!, quantity: e.target.value };
                    return { ...f, lines: n };
                  })} />
                  <input type="number" step="0.01" className={labInputClass(isLight) + " sm:col-span-3"} placeholder="P. unitario" value={ln.unit_price} onChange={(e) => void setForm((f) => {
                    const n = [...f.lines];
                    n[idx] = { ...n[idx]!, unit_price: e.target.value };
                    return { ...f, lines: n };
                  })} />
                  <button
                    type="button"
                    className={labGhostBtn(isLight) + " sm:col-span-1"}
                    onClick={() => void setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))}
                  >
                    −
                  </button>
                </div>
              ))}
              <button type="button" className={labGhostBtn(isLight)} onClick={() => void setForm((f) => ({ ...f, lines: [...f.lines, { description: "", quantity: "1", unit_price: "" }] }))}>
                + Línea
              </button>
            </div>
          </LabField>
          {err ? <p className="sm:col-span-2 text-sm text-red-600">{err}</p> : null}
        </div>
      </FormModal>

      <FormModal
        open={acceptId !== null}
        title="Convertir cotización en proyecto"
        isLight={isLight}
        onClose={() => setAcceptId(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => setAcceptId(null)}>Cancelar</button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void doAccept()}>Aceptar</button>
          </div>
        }
      >
        <div className="grid gap-3">
          <LabField label="Nombre del proyecto (opcional)" isLight={isLight}>
            <input className={labInputClass(isLight)} value={acceptForm.project_name} onChange={(e) => setAcceptForm({ ...acceptForm, project_name: e.target.value })} />
          </LabField>
          <LabField label="Tipo de servicio (opcional)" isLight={isLight}>
            <input className={labInputClass(isLight)} value={acceptForm.service_type} onChange={(e) => setAcceptForm({ ...acceptForm, service_type: e.target.value })} />
          </LabField>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
        </div>
      </FormModal>
    </main>
  );
}

export function OpportunitiesPage() {
  const { isLight } = useApexTheme();
  const [rows, setRows] = useState<LaravelPaginated<Record<string, unknown>> | null>(null);
  const [clients, setClients] = useState<ClientOpt[]>([]);
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [users, setUsers] = useState<CollabOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    client_id: "" as "" | number,
    area_id: "" as "" | number,
    owner_user_id: "" as "" | number,
    title: "",
    stage: "lead",
    probability: "",
    expected_amount: "",
    expected_close: "",
    next_followup_at: "",
    notes: "",
  });

  const load = () => void getJson<LaravelPaginated<Record<string, unknown>>>("/api/opportunities").then(setRows);

  useEffect(() => {
    load();
    void getJson<LaravelPaginated<ClientOpt>>("/api/clients", { per_page: 120 }).then((r) => setClients(r.data));
    void getJson<AreaOpt[]>("/api/areas", { active_only: false }).then(setAreas);
    void getJson<CollabOpt[]>("/api/collaborators").then(setUsers);
  }, []);

  const reset = () => {
    setEditId(null);
    setForm({
      client_id: "",
      area_id: "",
      owner_user_id: "",
      title: "",
      stage: "lead",
      probability: "",
      expected_amount: "",
      expected_close: "",
      next_followup_at: "",
      notes: "",
    });
    setErr(null);
  };

  const openNew = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (o: Record<string, unknown>) => {
    reset();
    setEditId(Number(o.id));
    const ar = (o.area as { id?: number } | undefined)?.id;
    const ow = typeof o.owner_user_id === "number" ? o.owner_user_id : "";
    setForm({
      client_id: typeof o.client_id === "number" ? o.client_id : "",
      area_id: typeof ar === "number" ? ar : "",
      owner_user_id: ow === "" ? "" : ow,
      title: String(o.title ?? ""),
      stage: String(o.stage ?? "lead"),
      probability: o.probability !== null && o.probability !== undefined ? String(o.probability) : "",
      expected_amount: o.expected_amount !== null && o.expected_amount !== undefined ? String(o.expected_amount) : "",
      expected_close: typeof o.expected_close === "string" ? o.expected_close.slice(0, 10) : "",
      next_followup_at: typeof o.next_followup_at === "string" ? o.next_followup_at.slice(0, 16) : "",
      notes: String(o.notes ?? ""),
    });
    setOpen(true);
  };

  const save = async () => {
    setErr(null);
    if (form.title.trim() === "" || form.client_id === "") {
      setErr("Título y cliente son obligatorios.");
      return;
    }
    const body: Record<string, unknown> = {
      client_id: form.client_id,
      title: form.title.trim(),
      stage: form.stage || null,
      area_id: form.area_id === "" ? null : form.area_id,
      owner_user_id: form.owner_user_id === "" ? null : form.owner_user_id,
      probability: form.probability === "" ? null : Number(form.probability),
      expected_amount: form.expected_amount === "" ? null : Number(form.expected_amount),
      expected_close: form.expected_close || null,
      next_followup_at: form.next_followup_at || null,
      notes: form.notes || null,
    };
    try {
      if (editId) await putJson(`/api/opportunities/${editId}`, body);
      else await postJson("/api/opportunities", body);
      setOpen(false);
      reset();
      load();
    } catch {
      setErr("No se pudo guardar.");
    }
  };

  const del = async (id: number) => {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    try {
      await deleteJson(`/api/opportunities/${id}`);
      load();
    } catch {
      setErr("No se pudo eliminar.");
    }
  };

  return (
    <main className={labCrudMainClass(isLight)}>
      <LabBreadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Oportunidades" }]} isLight={isLight} />
      <LabPageHeader
        title="Embudo comercial"
        subtitle="Registro integral con responsable y recordatorios de seguimiento."
        isLight={isLight}
        action={
          <button type="button" className={labPrimaryBtn(isLight)} onClick={openNew}>
            Nueva oportunidad
          </button>
        }
      />
      {err && !open ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}

      <div className={labPanelClass(isLight)}>
        {!rows ? (
          <p className="py-8 text-center">Cargando…</p>
        ) : (
          <div className={["overflow-x-auto", isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark"].join(" ")}>
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className={isLight ? "text-[#6B7280]" : "text-zinc-500"}>
                  <th className="pb-3 text-[10px] font-semibold uppercase">Título</th>
                  <th className="pb-3 text-[10px] font-semibold uppercase">Cliente</th>
                  <th className="pb-3 text-[10px] font-semibold uppercase">Etapa</th>
                  <th className="pb-3 text-right text-[10px] font-semibold uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {rows.data.map((o: Record<string, unknown>) => {
                  const cli = (o.client as { legal_name?: string } | undefined)?.legal_name ?? "—";
                  return (
                    <tr key={Number(o.id)} className={"border-t " + (isLight ? "border-[#F3F4F6]" : "border-white/[0.06]")}>
                      <td className={"py-2 font-semibold " + (isLight ? "text-[#111827]" : "text-white")}>{String(o.title)}</td>
                      <td className="py-2 text-xs">{cli}</td>
                      <td className="py-2 text-xs">{String(o.stage)}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button type="button" className={labGhostBtn(isLight)} onClick={() => openEdit(o)}>Editar</button>{" "}
                        <button type="button" className={labGhostBtn(isLight)} onClick={() => void del(Number(o.id))}>Eliminar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FormModal
        open={open}
        title={editId ? "Editar oportunidad" : "Nueva oportunidad"}
        isLight={isLight}
        wide
        onClose={() => {setOpen(false); reset();}}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className={labGhostBtn(isLight)} onClick={() => {setOpen(false); reset();}}>Cerrar</button>
            <button type="button" className={labPrimaryBtn(isLight)} onClick={() => void save()}>Guardar</button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <LabField label="Cliente *" isLight={isLight} className="sm:col-span-2">
            <select
              disabled={editId !== null}
              className={labInputClass(isLight)}
              value={form.client_id === "" ? "" : String(form.client_id)}
              onChange={(e) => setForm({ ...form, client_id: e.target.value ? Number(e.target.value) : "" })}
            >
              <option value="">Seleccionar…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>
          </LabField>
          <LabField label="Título *" isLight={isLight} className="sm:col-span-2">
            <input className={labInputClass(isLight)} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </LabField>
          <LabField label="Área" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.area_id === "" ? "" : String(form.area_id)} onChange={(e) => setForm({ ...form, area_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">—</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </LabField>
          <LabField label="Responsable" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.owner_user_id === "" ? "" : String(form.owner_user_id)} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value ? Number(e.target.value) : "" })}>
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </LabField>
          <LabField label="Etapa" isLight={isLight}>
            <select className={labInputClass(isLight)} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              <option value="lead">Lead</option>
              <option value="qualified">Calificado</option>
              <option value="proposal">Propuesta</option>
              <option value="negotiation">Negociación</option>
              <option value="won">Ganada</option>
              <option value="lost">Perdida</option>
            </select>
          </LabField>
          <LabField label="Probabilidad %" isLight={isLight}>
            <input type="number" min={0} max={100} className={labInputClass(isLight)} value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
          </LabField>
          <LabField label="Monto esperado" isLight={isLight}>
            <input type="number" step="0.01" className={labInputClass(isLight)} value={form.expected_amount} onChange={(e) => setForm({ ...form, expected_amount: e.target.value })} />
          </LabField>
          <LabField label="Cierre esperado" isLight={isLight}>
            <input type="date" className={labInputClass(isLight)} value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} />
          </LabField>
          <LabField label="Próximo seguimiento" isLight={isLight}>
            <input type="datetime-local" className={labInputClass(isLight)} value={form.next_followup_at} onChange={(e) => setForm({ ...form, next_followup_at: e.target.value })} />
          </LabField>
          <LabField label="Notas" isLight={isLight} className="sm:col-span-2">
            <textarea className={labInputClass(isLight)} rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </LabField>
          {err ? <p className="sm:col-span-2 text-sm text-red-600">{err}</p> : null}
        </div>
      </FormModal>
    </main>
  );
}
