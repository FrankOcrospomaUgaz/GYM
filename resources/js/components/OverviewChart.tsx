import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApexTheme } from "../context/ThemeContext";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const revenueSeries = [42, 48, 40, 55, 52, 68, 62, 75, 70, 82, 78, 90];
const ordersSeries = [28, 32, 30, 38, 35, 42, 40, 48, 45, 52, 50, 55];
const profitSeries = [18, 22, 20, 28, 25, 32, 30, 38, 35, 42, 40, 48];

const tabs = [
  { id: "revenue" as const, label: "Revenue" },
  { id: "orders" as const, label: "Orders" },
  { id: "profit" as const, label: "Profit" },
];

export function OverviewChart() {
  const { isLight } = useApexTheme();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("revenue");

  const lineColor = isLight ? "#007BFF" : "#007BFF";

  const data = useMemo(() => {
    const pick =
      tab === "revenue" ? revenueSeries : tab === "orders" ? ordersSeries : profitSeries;
    return months.map((m, i) => ({ name: m, v: pick[i] ?? 0 }));
  }, [tab]);

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
      <div className="mb-2 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            className={["text-base font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}
          >
            Overview
          </h2>
          <p className={["text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
            Monthly performance for the current year.
          </p>
        </div>
        <div
          className={[
            "inline-flex gap-0.5 rounded-lg p-0.5",
            isLight ? "border border-[#E5E7EB] bg-[#F9FAFB]" : "border border-white/[0.08] bg-black/30",
          ].join(" ")}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? isLight
                    ? "bg-white text-[#007BFF] shadow-sm ring-1 ring-[#E5E7EB]"
                    : "bg-white/[0.1] text-[#7AB8FF] shadow-sm"
                  : isLight
                    ? "text-[#6B7280] hover:text-[#111827]"
                    : "text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 w-full" style={{ minHeight: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ov-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={isLight ? 0.25 : 0.3} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isLight ? "#F3F4F6" : "rgba(255,255,255,0.04)"}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              stroke={isLight ? "#9CA3AF" : "#52525b"}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={isLight ? "#9CA3AF" : "#52525b"}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyles}
              labelStyle={{ color: isLight ? "#6B7280" : "#a1a1aa" }}
              itemStyle={{ color: lineColor }}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke={lineColor}
              strokeWidth={2}
              fill="url(#ov-area)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
