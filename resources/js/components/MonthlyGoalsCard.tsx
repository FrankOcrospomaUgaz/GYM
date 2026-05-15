import { useApexTheme } from "../context/ThemeContext";

type GoalRow = {
  id: string;
  label: string;
  pct: number;
  current: string;
  target: string;
  barClassLight: string;
  barClassDark: string;
};

const goals: GoalRow[] = [
  {
    id: "rev",
    label: "Monthly Revenue",
    pct: 88,
    current: "48,295",
    target: "55,000",
    barClassLight: "bg-[#007BFF]",
    barClassDark: "bg-[#007BFF]",
  },
  {
    id: "cust",
    label: "New Customers",
    pct: 85,
    current: "847",
    target: "1,000",
    barClassLight: "bg-[#3399FF]",
    barClassDark: "bg-[#3399FF]",
  },
  {
    id: "conv",
    label: "Conversion Rate",
    pct: 76,
    current: "3.8",
    target: "5",
    barClassLight: "bg-[#5BA3FF]",
    barClassDark: "bg-[#5BA3FF]",
  },
];

export function MonthlyGoalsCard() {
  const { isLight } = useApexTheme();
  return (
    <div
      className={[
        "flex flex-col rounded-xl p-4 sm:rounded-2xl sm:p-5",
        isLight
          ? "border border-[#E5E7EB] bg-white shadow-sm"
          : "rounded-2xl border border-white/[0.05] bg-[#121212] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]",
      ].join(" ")}
    >
      <h2 className={["text-base font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>
        Monthly Goals
      </h2>
      <p className={["mb-5 mt-0.5 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
        Progress toward this month&apos;s targets.
      </p>
      <ul className="flex flex-col gap-5">
        {goals.map((g) => (
          <li key={g.id}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className={["text-sm font-medium", isLight ? "text-[#111827]" : "text-zinc-200"].join(" ")}>
                {g.label}
              </span>
              <span className={["text-xs font-semibold", isLight ? "text-[#007BFF]" : "text-[#7AB8FF]"].join(" ")}>
                {g.pct}%
              </span>
            </div>
            <div
              className={[
                "h-2 w-full overflow-hidden rounded-full",
                isLight ? "bg-[#F3F4F6]" : "bg-white/[0.08]",
              ].join(" ")}
            >
              <div
                className={["h-full rounded-full transition-[width]", isLight ? g.barClassLight : g.barClassDark].join(
                  " ",
                )}
                style={{ width: `${g.pct}%` }}
              />
            </div>
            <p className={["mt-1.5 text-xs", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
              <span className={["font-medium", isLight ? "text-[#111827]" : "text-zinc-300"].join(" ")}>
                {g.current}
              </span>
              {" · "}
              Target: {g.target}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
