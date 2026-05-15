import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApexTheme } from "../context/ThemeContext";

const data = [
  { name: "2025-12", v: 1.85 },
  { name: "2026-01", v: 1.42 },
  { name: "2026-02", v: 0.95 },
];

export function RevenueLineChart() {
  const { isLight } = useApexTheme();
  const stroke = isLight ? "#007BFF" : "#007BFF";

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
        "flex min-h-[280px] flex-col rounded-xl p-4 sm:min-h-[320px] sm:rounded-2xl sm:p-5",
        isLight
          ? "border border-[#E5E7EB] bg-white shadow-sm"
          : "rounded-2xl border border-white/[0.05] bg-[#121212] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
      ].join(" ")}
    >
      <div className="mb-4">
        <h2 className={["text-base font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>
          Revenue trend
        </h2>
        <p className={["mt-0.5 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
          Net revenue over recent months.
        </p>
      </div>
      <div className="min-h-0 w-full flex-1" style={{ minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
              width={40}
              tickFormatter={(v) => `$${v}k`}
            />
            <Tooltip
              contentStyle={tooltipStyles}
              labelStyle={{ color: isLight ? "#6B7280" : "#a1a1aa" }}
              formatter={(val) => {
                const n = typeof val === "number" ? val : Number(val);
                return [`$${Number.isFinite(n) ? n.toFixed(2) : "0"}k`, "Revenue"];
              }}
            />
            <Line type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} dot={{ r: 3, fill: stroke }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
