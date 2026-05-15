import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useApexTheme } from "../context/ThemeContext";
import { getJson, type LaravelPaginated } from "../xpande/http";

type ProjectRow = {
  id: number;
  name: string;
  status: string;
  start_date?: string | null;
  budget?: string | number | null;
  client?: { legal_name?: string };
};

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En proceso",
    paused: "Pausado",
    finished: "Finalizado",
    cancelled: "Cancelado",
  };
  return m[status] ?? status;
}

function statusPill(status: string, isLight: boolean) {
  if (status === "finished") {
    return isLight ? "bg-[#E6F3FF] text-[#005BBF] ring-1 ring-[#007BFF]/22" : "bg-[#0a2744] text-[#7AB8FF] ring-1 ring-[#007BFF]/35";
  }
  if (status === "cancelled") {
    return isLight ? "bg-zinc-200 text-zinc-800 ring-1 ring-zinc-300/80" : "bg-zinc-800 text-zinc-300 ring-1 ring-zinc-600/35";
  }
  if (status === "paused") {
    return isLight ? "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80" : "bg-amber-950/40 text-amber-300 ring-1 ring-amber-500/25";
  }
  if (status === "in_progress") {
    return isLight ? "bg-[#DCEEFF] text-[#0063D5] ring-1 ring-[#3399FF]/30" : "bg-[#0d2a4a] text-[#8EC5FF] ring-1 ring-[#3399FF]/28";
  }
  return isLight ? "bg-slate-100 text-slate-800 ring-1 ring-slate-200/80" : "bg-slate-900/80 text-slate-200 ring-1 ring-slate-600/35";
}

function initialsFrom(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "—";
  if (p.length === 1) return (p[0][0] ?? "P").toUpperCase();
  return ((p[0][0] ?? "") + (p[p.length - 1][0] ?? "")).toUpperCase();
}

export function RecentOrdersTable() {
  const { isLight } = useApexTheme();
  const [rows, setRows] = useState<ProjectRow[] | null>(null);

  useEffect(() => {
    void getJson<LaravelPaginated<ProjectRow>>("/api/projects", { per_page: 8 }).then((r) => setRows(r.data));
  }, []);

  return (
    <div
      className={[
        "flex flex-col rounded-xl p-4 sm:rounded-2xl sm:p-5",
        isLight
          ? "border border-[#E5E7EB] bg-white shadow-sm"
          : "rounded-2xl border border-white/[0.05] bg-[#121212] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className={["text-base font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>
            Proyectos recientes
          </h2>
          <p className={["mt-0.5 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
            Últimos proyectos creados según su alcance de áreas.
          </p>
        </div>
        <Link to="/proyectos" className={["shrink-0 text-sm font-medium", isLight ? "text-[#007BFF] hover:text-[#0063D5]" : "text-[#7AB8FF] hover:text-[#A8D4FF]"].join(" ")}>
          Ver todos
        </Link>
      </div>
      <div
        className={[
          "-mx-1 overflow-x-auto px-1",
          isLight ? "apex-table-scroll--light" : "apex-table-scroll--dark",
        ].join(" ")}
      >
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead>
            <tr
              className={[
                "border-b text-xs font-semibold uppercase tracking-wide",
                isLight ? "border-[#E5E7EB] text-[#6B7280]" : "border-white/[0.08] text-zinc-500",
              ].join(" ")}
            >
              <th className="pb-3 pr-3 font-medium">Cliente / Proyecto</th>
              <th className="pb-3 pr-3 font-medium">ID</th>
              <th className="pb-3 pr-3 font-medium">Inicio</th>
              <th className="pb-3 pr-3 font-medium">Estado</th>
              <th className="pb-3 text-right font-medium">Presupuesto</th>
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr>
                <td colSpan={5} className={["py-6 text-center text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={["py-6 text-center text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
                  No hay proyectos en su alcance.
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const clientName = p.client?.legal_name ?? "—";
                const ini = initialsFrom(clientName);
                const budget =
                  p.budget !== null && p.budget !== undefined && String(p.budget).length > 0 ? `S/. ${Number(p.budget).toLocaleString("es-PE", { minimumFractionDigits: 2 })}` : "—";
                return (
                  <tr
                    key={p.id}
                    className={[
                      "border-b last:border-0",
                      isLight ? "border-[#F3F4F6]" : "border-white/[0.06]",
                    ].join(" ")}
                  >
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            isLight ? "bg-[#F3F4F6] text-[#374151]" : "bg-zinc-800 text-zinc-300",
                          ].join(" ")}
                        >
                          {ini}
                        </div>
                        <span className={["font-medium", isLight ? "text-[#111827]" : "text-zinc-200"].join(" ")}>{clientName}</span>
                      </div>
                      <p className={["mt-0.5 pl-12 text-xs", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{p.name}</p>
                    </td>
                    <td className={["py-3 pr-3 font-mono text-xs", isLight ? "text-[#6B7280]" : "text-zinc-400"].join(" ")}>#{p.id}</td>
                    <td className={["py-3 pr-3", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{p.start_date ? String(p.start_date) : "—"}</td>
                    <td className="py-3 pr-3">
                      <span className={["inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", statusPill(p.status, isLight)].join(" ")}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td className={["py-3 text-right font-medium tabular-nums", isLight ? "text-[#111827]" : "text-zinc-200"].join(" ")}>{budget}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
