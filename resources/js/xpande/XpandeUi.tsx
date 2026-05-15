import { type ReactNode } from "react";
import { Link } from "react-router-dom";

export function labCrudMainClass(isLight: boolean): string {
  return [
    "min-h-0 flex-1 overflow-y-auto p-4 pb-10 lg:p-6 lg:pb-12",
    isLight ? "bg-[#F9FAFB] apex-main-scroll--light" : "bg-[#000000] apex-main-scroll--dark",
  ].join(" ");
}

export function labPanelClass(isLight: boolean): string {
  return isLight
    ? "rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5"
    : "rounded-xl border border-white/[0.06] bg-[#121212] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:p-5";
}

export function labInputClass(isLight: boolean): string {
  return isLight
    ? "w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] outline-none ring-[#007BFF]/18 focus:ring-2"
    : "w-full rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none ring-[#007BFF]/22 focus:ring-2";
}

export function labPrimaryBtn(isLight: boolean): string {
  return isLight
    ? "inline-flex items-center justify-center gap-2 rounded-lg bg-[#007BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0063D5]"
    : "inline-flex items-center justify-center gap-2 rounded-lg bg-[#007BFF] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_22px_rgba(0,123,255,0.38)] transition hover:brightness-110";
}

export function labGhostBtn(isLight: boolean): string {
  return isLight
    ? "inline-flex items-center justify-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
    : "inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-[#0a0a0a] px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.04]";
}

export type Crumb = { label: string; to?: string };

export function LabBreadcrumbs({ items, isLight }: { items: Crumb[]; isLight: boolean }) {
  return (
    <nav
      className={["mb-2 flex flex-wrap items-center gap-x-1.5 text-xs font-medium", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}
      aria-label="Breadcrumb"
    >
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 ? <span className="opacity-50">/</span> : null}
          {it.to ? (
            <Link
              to={it.to}
              className={[
                "transition-colors",
                isLight ? "text-[#6B7280] hover:text-[#111827]" : "text-zinc-500 hover:text-zinc-200",
              ].join(" ")}
            >
              {it.label}
            </Link>
          ) : (
            <span className={isLight ? "text-[#111827]" : "text-zinc-200"}>{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function LabPageHeader({
  title,
  subtitle,
  action,
  isLight,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
  isLight: boolean;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className={["text-2xl font-bold tracking-tight sm:text-3xl", isLight ? "text-[#111827]" : "text-zinc-50"].join(" ")}>
          {title}
        </h1>
        <p className={["mt-1 max-w-2xl text-sm leading-relaxed", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{subtitle}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function LabToolbar({
  tabs,
  activeTab,
  onTab,
  searchPlaceholder,
  search,
  onSearch,
  isLight,
  right,
}: {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTab: (id: string) => void;
  searchPlaceholder: string;
  search: string;
  onSearch: (v: string) => void;
  isLight: boolean;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            className={[
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              activeTab === t.id
                ? isLight
                  ? "bg-[#111827] text-white"
                  : "bg-zinc-800 text-zinc-100 ring-1 ring-white/10"
                : isLight
                  ? "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                  : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:min-w-0 lg:flex-1 lg:justify-end">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className={[
            "min-w-0 flex-1 rounded-lg px-3 py-2.5 text-sm sm:max-w-xs lg:max-w-md",
            labInputClass(isLight),
          ].join(" ")}
        />
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
    </div>
  );
}

export function LabFormSection({
  title,
  description,
  isLight,
  children,
  footer,
}: {
  title: string;
  description: string;
  isLight: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={`mb-5 ${labPanelClass(isLight)}`}>
      <div className={["mb-5 border-b pb-4", isLight ? "border-[#E5E7EB]" : "border-white/[0.06]"].join(" ")}>
        <h2 className={["text-base font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>{title}</h2>
        <p className={["mt-1 text-sm", isLight ? "text-[#6B7280]" : "text-zinc-500"].join(" ")}>{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      {footer ? (
        <div className={["mt-6 flex flex-wrap gap-2 border-t pt-4", isLight ? "border-[#E5E7EB]" : "border-white/[0.06]"].join(" ")}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}

export function LabField({
  label,
  hint,
  isLight,
  children,
  className,
}: {
  label: string;
  hint?: string;
  isLight: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? ""}>
      <label className={["mb-1.5 block text-sm font-medium", isLight ? "text-[#374151]" : "text-zinc-200"].join(" ")}>{label}</label>
      {children}
      {hint ? <p className={["mt-1 text-xs", isLight ? "text-[#9CA3AF]" : "text-zinc-600"].join(" ")}>{hint}</p> : null}
    </div>
  );
}

export function labStatusPill(status: "ok" | "neutral" | "warn", isLight: boolean): string {
  if (status === "ok") {
    return isLight
      ? "inline-flex rounded-full bg-[#E6F3FF] px-2.5 py-0.5 text-xs font-semibold text-[#005BBF] ring-1 ring-[#007BFF]/25"
      : "inline-flex rounded-full bg-[#0a2744] px-2.5 py-0.5 text-xs font-semibold text-[#7AB8FF] ring-1 ring-[#007BFF]/38";
  }
  if (status === "warn") {
    return isLight
      ? "inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/80"
      : "inline-flex rounded-full bg-amber-950/40 px-2.5 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-500/25";
  }
  return isLight
    ? "inline-flex rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-semibold text-[#4B5563] ring-1 ring-[#E5E7EB]"
    : "inline-flex rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10";
}

export function initialsFrom(text: string, max = 2): string {
  const p = text.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) {
    return "?";
  }
  if (p.length === 1) {
    return p[0].slice(0, max).toUpperCase();
  }
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}
