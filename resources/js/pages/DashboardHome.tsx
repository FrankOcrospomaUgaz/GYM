import { KpiCards } from "../components/KpiCards";
import { MonthlyGoalsCard } from "../components/MonthlyGoalsCard";
import { OverviewChart } from "../components/OverviewChart";
import { OrdersByStatus } from "../components/OrdersByStatus";
import { RecentActivityList } from "../components/RecentActivityList";
import { RecentOrdersTable } from "../components/RecentOrdersTable";
import { RevenueLineChart } from "../components/RevenueLineChart";
import { useApexTheme } from "../context/ThemeContext";

export function DashboardHome() {
  const { isLight } = useApexTheme();
  return (
    <main
      className={[
        "min-h-0 flex-1 overflow-y-auto p-4 pb-10 lg:p-6 lg:pb-12",
        isLight ? "bg-[#F9FAFB] apex-main-scroll--light" : "bg-[#000000] apex-main-scroll--dark",
      ].join(" ")}
    >
      <div className="mb-6">
        <h1
          className={[
            "text-2xl font-bold tracking-tight",
            isLight ? "text-[#111827]" : "text-zinc-100",
          ].join(" ")}
        >
          Panel corporativo
        </h1>
        <p className={["mt-1 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
          Visión ejecutiva consolidada entre Xingeria, Xpande y Xango con foco financiero mensual y proyectos.
        </p>
      </div>
      <KpiCards />
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <OverviewChart />
        </div>
        <div className="lg:col-span-2">
          <OrdersByStatus />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueLineChart />
        </div>
        <div className="lg:col-span-2">
          <MonthlyGoalsCard />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-1 xl:grid-cols-2">
        <RecentOrdersTable />
        <RecentActivityList />
      </div>
    </main>
  );
}
