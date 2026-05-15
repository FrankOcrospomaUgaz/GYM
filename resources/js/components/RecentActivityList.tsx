import { useApexTheme } from "../context/ThemeContext";

type ActivityItem = {
  id: string;
  title: string;
  actor: string;
  time: string;
};

const items: ActivityItem[] = [
  { id: "1", title: "Order completed", actor: "Algare Silkalns", time: "1 month ago" },
  { id: "2", title: "User logged in", actor: "Algare Silkalns", time: "1 month ago" },
  { id: "3", title: "Product inventory updated", actor: "System", time: "2 months ago" },
  { id: "4", title: "New customer registered", actor: "Sofia Martinez", time: "2 months ago" },
  { id: "5", title: "Invoice paid", actor: "Marcus Chen", time: "3 months ago" },
];

export function RecentActivityList() {
  const { isLight } = useApexTheme();
  const dotRing = isLight ? "ring-white" : "ring-[#121212]";
  const dotFill = isLight ? "bg-[#007BFF]" : "bg-[#007BFF]";

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
            Recent Activity
          </h2>
          <p className={["mt-0.5 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
            Timeline of notable events.
          </p>
        </div>
        <a
          href="#"
          className={[
            "shrink-0 text-sm font-medium",
            isLight ? "text-[#007BFF] hover:text-[#0063D5]" : "text-[#7AB8FF] hover:text-[#A8D4FF]",
          ].join(" ")}
        >
          View all
        </a>
      </div>
      <ul className="flex flex-col gap-0">
        {items.map((it, idx) => (
          <li
            key={it.id}
            className={[
              "flex gap-3 py-3",
              idx < items.length - 1 ? (isLight ? "border-b border-[#F3F4F6]" : "border-b border-white/[0.06]") : "",
            ].join(" ")}
          >
            <div className="relative flex shrink-0 flex-col items-center pt-0.5">
              <span
                className={[
                  "relative z-10 h-2.5 w-2.5 rounded-full ring-2",
                  dotFill,
                  dotRing,
                  isLight ? "shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" : "shadow-[0_0_0_3px_rgba(61,255,122,0.15)]",
                ].join(" ")}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className={["text-sm font-medium", isLight ? "text-[#111827]" : "text-zinc-200"].join(" ")}>
                {it.title}
              </p>
              <p className={["mt-0.5 text-xs", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>
                {it.actor} · {it.time}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
