import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useApexTheme } from "../context/ThemeContext";
import { readApexPayload } from "../types/apex";

const defaultData = [
  { name: "Pendiente", value: 35, color: "#007BFF" },
  { name: "En proceso", value: 28, color: "#3399FF" },
  { name: "Pausado", value: 12, color: "#f59e0b" },
  { name: "Finalizado", value: 20, color: "#5BA3FF" },
  { name: "Cancelado", value: 5, color: "#94a3b8" },
];

function buildData() {
  const ax = readApexPayload();
  if (ax?.orderStatus?.length) {
    return ax.orderStatus;
  }
  return defaultData;
}

function totalOrders(): number {
  const ax = readApexPayload();
  if (ax != null) {
    return ax.orderTotal;
  }
  return 20;
}

export function OrdersByStatus() {
  const { isLight } = useApexTheme();
  const data = buildData();
  const total = totalOrders();

  const tooltipStyles = isLight
    ? {
        background: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        fontSize: 12,
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.08)",
      }
    : {
        background: "#161616",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "8px",
        fontSize: 12,
      };

  return (
    <div
      className={[
        "flex h-full min-h-[300px] flex-col rounded-xl p-4 sm:rounded-2xl sm:p-5",
        isLight
          ? "border border-[#E5E7EB] bg-white shadow-sm"
          : "rounded-2xl border border-white/[0.05] bg-[#121212] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
      ].join(" ")}
    >
      <h2 className={["mb-1 text-base font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>
        Proyectos por estado
      </h2>
      <p className={["mb-4 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
        Distribución porcentual de proyectos registrados en el sistema.
      </p>

      <div className="relative flex min-h-0 flex-1 items-center justify-center" style={{ minHeight: 220 }}>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className={["text-2xl font-bold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>
              {total}
            </p>
            <p className={["text-xs", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>Proyectos</p>
          </div>
        </div>
        <div className="h-[220px] w-full max-w-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="62%"
                outerRadius="88%"
                paddingAngle={2}
                stroke="none"
              >
                {data.map((e) => (
                  <Cell key={e.name} fill={e.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyles}
                formatter={(val, _name, item) => [
                  `${val}%`,
                  (item as { payload?: { name?: string } }).payload?.name ?? "",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ul className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
        {data.map((d) => (
          <li
            key={d.name}
            className={[
              "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5",
              isLight ? "bg-[#F9FAFB]" : "bg-white/[0.03]",
            ].join(" ")}
          >
            <span
              className={[
                "flex items-center gap-2",
                isLight ? "text-[#6B7280]" : "text-zinc-400",
              ].join(" ")}
            >
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span
              className={["font-medium", isLight ? "text-[#111827]" : "text-zinc-200"].join(" ")}
            >
              {d.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
