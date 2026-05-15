import { type LucideIcon, DollarSign, Eye, ShoppingCart, Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useApexTheme } from "../context/ThemeContext";
import { readApexPayload } from "../types/apex";

const mkSpark = (n = 8) =>
  Array.from({ length: n }, (_, i) => ({
    i,
    v: 30 + Math.sin(i * 0.6) * 20 + (i / n) * 25,
  }));

type Kpi = {
  id: string;
  title: string;
  value: string;
  delta: string;
  up: boolean;
  chartColor: string;
  chartColorLight: string;
  icon: LucideIcon;
  iconWrapDark: string;
  iconWrapLight: string;
  data: { i: number; v: number }[];
};

const baseKpis: Kpi[] = [
  {
    id: "revenue",
    title: "Pipeline financiero",
    value: "$3,142.74",
    delta: "+12.5% vs last month",
    up: true,
    chartColor: "#007BFF",
    chartColorLight: "#007BFF",
    icon: DollarSign,
    iconWrapDark: "bg-[#0a2744] text-[#7AB8FF] ring-1 ring-[#007BFF]/35",
    iconWrapLight: "bg-[#E6F3FF] text-[#007BFF] ring-1 ring-[#007BFF]/20",
    data: mkSpark(),
  },
  {
    id: "active_users",
    title: "Active Users",
    value: "12",
    delta: "+8.2% vs last month",
    up: true,
    chartColor: "#3399FF",
    chartColorLight: "#0B84FF",
    icon: Users,
    iconWrapDark: "bg-[#0a2744] text-[#7AB8FF] ring-1 ring-[#3399FF]/30",
    iconWrapLight: "bg-[#E6F3FF] text-[#0063D5] ring-1 ring-[#007BFF]/18",
    data: mkSpark(),
  },
  {
    id: "total_orders",
    title: "Total Orders",
    value: "20",
    delta: "−3.1% vs last month",
    up: false,
    chartColor: "#5BA3FF",
    chartColorLight: "#007BFF",
    icon: ShoppingCart,
    iconWrapDark: "bg-[#0d2a4a] text-[#8EC5FF] ring-1 ring-[#5BA3FF]/28",
    iconWrapLight: "bg-[#E6F3FF] text-[#007BFF] ring-1 ring-[#007BFF]/18",
    data: Array.from({ length: 8 }, (_, i) => ({ i, v: 40 + Math.cos(i * 0.5) * 15 })),
  },
  {
    id: "customers",
    title: "Customers",
    value: "18",
    delta: "+24.7% vs last month",
    up: true,
    chartColor: "#66B0FF",
    chartColorLight: "#1A8CFF",
    icon: Eye,
    iconWrapDark: "bg-[#0a2744] text-[#9BCFFF] ring-1 ring-[#66B0FF]/25",
    iconWrapLight: "bg-[#E6F3FF] text-[#0063D5] ring-1 ring-[#007BFF]/18",
    data: (() => Array.from({ length: 8 }, (_, i) => ({ i, v: 25 + (i / 7) * 30 + Math.sin(i) * 8 })))(),
  },
];

function buildKpis(): Kpi[] {
  const ax = readApexPayload();
  if (!ax?.kpi?.length) {
    return baseKpis;
  }
  return baseKpis.map((row) => {
    const s = ax.kpi.find((k) => k.id === row.id);
    if (!s) {
      return row;
    }
    return {
      ...row,
      title: s.title,
      value: s.value,
      delta: s.delta,
      up: s.up,
    };
  });
}

function MiniSparkline({ data, color, gradId }: { data: { i: number; v: number }[]; color: string; gradId: string }) {
  return (
    <div className="h-10 w-24 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function KpiCards() {
  const { isLight } = useApexTheme();
  const kpis = buildKpis();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        const gradId = `spark-grad-${k.id}`;
        const chartColor = isLight ? k.chartColorLight : k.chartColor;
        const iconWrap = isLight ? k.iconWrapLight : k.iconWrapDark;
        return (
          <div
            key={k.id}
            className={[
              "flex flex-col rounded-xl p-4 sm:rounded-2xl",
              isLight
                ? "border border-[#E5E7EB] bg-white shadow-sm"
                : "rounded-2xl border border-white/[0.05] bg-[#121212] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
            ].join(" ")}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className={["text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{k.title}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconWrap}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p
              className={[
                "text-2xl font-semibold tracking-tight",
                isLight ? "text-[#111827]" : "text-zinc-100",
              ].join(" ")}
            >
              {k.value}
            </p>
            <p
              className={[
                "mt-1 text-xs",
                k.up
                  ? isLight
                    ? "text-[#007BFF]"
                    : "text-[#7AB8FF]/95"
                  : isLight
                    ? "text-[#EF4444]"
                    : "text-rose-400/90",
              ].join(" ")}
            >
              {k.delta}
            </p>
            <div className="mt-3 flex items-end justify-end">
              <MiniSparkline data={k.data} color={chartColor} gradId={gradId} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
