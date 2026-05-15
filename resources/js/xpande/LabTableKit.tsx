import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Ban,
  ExternalLink,
  Eye,
  FileText,
  Pencil,
  Printer,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

const CIRCLE_BTN =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0";

const VARIANT_META: Record<
  "edit" | "delete" | "details" | "pdf" | "print" | "link" | "cancel",
  { Icon: LucideIcon; className: string }
> = {
  edit: {
    Icon: Pencil,
    className:
      `${CIRCLE_BTN} bg-[#EAB308] shadow-[0_2px_10px_rgba(234,179,8,0.45)] hover:bg-[#CA8A04]`,
  },
  delete: {
    Icon: Trash2,
    className: `${CIRCLE_BTN} bg-[#DC2626] shadow-[0_2px_10px_rgba(220,38,38,0.42)] hover:bg-[#B91C1C]`,
  },
  details: {
    Icon: Eye,
    className: `${CIRCLE_BTN} bg-[#007BFF] shadow-[0_2px_10px_rgba(0,123,255,0.45)] hover:bg-[#0063D5]`,
  },
  pdf: {
    Icon: FileText,
    className:
      `${CIRCLE_BTN} bg-[#EC4899] shadow-[0_2px_10px_rgba(236,72,153,0.35)] hover:bg-[#DB2777]`,
  },
  print: {
    Icon: Printer,
    className: `${CIRCLE_BTN} bg-[#9333EA] shadow-[0_2px_10px_rgba(147,51,234,0.35)] hover:bg-[#7E22CE]`,
  },
  link: {
    Icon: ExternalLink,
    className: `${CIRCLE_BTN} bg-[#7C3AED] shadow-[0_2px_10px_rgba(124,58,237,0.35)] hover:bg-[#6D28D9]`,
  },
  cancel: {
    Icon: Ban,
    className: `${CIRCLE_BTN} bg-[#EA580C] shadow-[0_2px_10px_rgba(234,88,12,0.35)] hover:bg-[#C2410C]`,
  },
};

export function LabCircleIconAction({
  variant,
  tooltip,
  onClick,
  disabled,
  type = "button",
  ariaLabel,
}: {
  variant: keyof typeof VARIANT_META;
  tooltip: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const meta = VARIANT_META[variant];
  const IconCmp = meta.Icon;
  const label = ariaLabel ?? tooltip;
  return (
    <span className="group relative inline-flex">
      <button
        type={type}
        aria-label={label}
        title={tooltip}
        disabled={disabled}
        onClick={onClick}
        className={meta.className}
      >
        <IconCmp className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-[40] hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium leading-tight text-white shadow-lg ring-1 ring-black/40 group-hover:block"
      >
        {tooltip}
      </span>
    </span>
  );
}

export function LabNoticeModal({
  open,
  variant,
  title,
  message,
  isLight,
  onClose,
  buttonLabel = "Entendido",
}: {
  open: boolean;
  variant: "success" | "error";
  title: string;
  message: string;
  isLight: boolean;
  onClose: () => void;
  buttonLabel?: string;
}) {
  if (!open) {
    return null;
  }
  const okRing = variant === "success" ? "ring-green-600/35" : "ring-red-600/35";
  const badge =
    variant === "success"
      ? "border-green-600/35 bg-green-600/15 text-green-600"
      : "border-red-600/35 bg-red-600/15 text-red-600";
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <button type="button" aria-label="Cerrar aviso" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lab-notice-title"
        aria-describedby="lab-notice-msg"
        className={[
          "relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl ring-2 ring-inset",
          okRing,
          isLight ? "border-[#E5E7EB] bg-white" : "border-white/[0.1] bg-[#121212]",
        ].join(" ")}
      >
        <div
          className={[
            "mb-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
            badge,
          ].join(" ")}
        >
          {variant === "success" ? "Éxito" : "Error"}
        </div>
        <h3 id="lab-notice-title" className={["text-lg font-semibold", isLight ? "text-[#111827]" : "text-zinc-100"].join(" ")}>
          {title}
        </h3>
        <p id="lab-notice-msg" className={["mt-2 text-sm whitespace-pre-wrap", isLight ? "text-[#4B5563]" : "text-zinc-400"].join(" ")}>
          {message}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={[
              "rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-110",
              variant === "success" ? "bg-green-600" : "bg-red-600",
            ].join(" ")}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LabDataPager({
  page,
  lastPage,
  total,
  perPage,
  isLight,
  onPageChange,
  onPerPageChange,
  extraRight,
}: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  isLight: boolean;
  onPageChange: (p: number) => void;
  onPerPageChange?: (pp: number) => void;
  extraRight?: ReactNode;
}) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  const mute = isLight ? "text-[#6B7280]" : "text-zinc-500";
  return (
    <div className={`mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs ${mute}`}>
      <span className="font-medium">
        Mostrando <span className={isLight ? "text-[#111827]" : "text-zinc-200"}>{start}</span>
        {" · "}
        <span className={isLight ? "text-[#111827]" : "text-zinc-200"}>{end}</span> de{" "}
        <span className={isLight ? "text-[#111827]" : "text-zinc-200"}>{total}</span>
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {onPerPageChange ? (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Por página</span>
            <select
              value={perPage}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) {
                  onPerPageChange(n);
                }
              }}
              className={[
                "rounded-lg border px-2 py-1.5 text-xs font-semibold outline-none ring-[#007BFF]/20 focus:ring-2",
                isLight ? "border-[#E5E7EB] bg-white text-[#111827]" : "border-white/[0.08] bg-[#0a0a0a] text-zinc-100",
              ].join(" ")}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="hidden sm:inline">Página</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <PagerBtn isLight={isLight} disabled={page <= 1} onClick={() => onPageChange(1)}>
            «
          </PagerBtn>
          <PagerBtn isLight={isLight} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            ‹
          </PagerBtn>
          <span className={["min-w-[5.5rem] select-none px-2 text-center font-semibold", isLight ? "text-[#111827]" : "text-zinc-200"].join(" ")}>
            {page} / {lastPage || 1}
          </span>
          <PagerBtn isLight={isLight} disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
            ›
          </PagerBtn>
          <PagerBtn isLight={isLight} disabled={page >= lastPage} onClick={() => onPageChange(lastPage)}>
            »
          </PagerBtn>
        </div>
        {extraRight}
      </div>
    </div>
  );
}

function PagerBtn({
  children,
  isLight,
  disabled,
  onClick,
}: {
  children: ReactNode;
  isLight: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "h-8 min-w-[32px] rounded-lg px-2 text-sm font-semibold transition",
        disabled
          ? "cursor-not-allowed opacity-35"
          : isLight
            ? "border border-[#E5E7EB] bg-white text-[#374151] hover:bg-[#F9FAFB]"
            : "border border-white/[0.08] bg-[#161616] text-zinc-200 hover:bg-white/[0.06]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function circleRowActionClass(variant: keyof typeof VARIANT_META): string {
  return VARIANT_META[variant].className;
}

export function LabSortableTh({
  label,
  sorted,
  isLight,
  align = "left",
  onToggle,
  className = "",
}: {
  label: string;
  sorted: "asc" | "desc" | null;
  isLight: boolean;
  align?: "left" | "right";
  onToggle: () => void;
  className?: string;
}) {
  const Arrow: LucideIcon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  const active = sorted !== null;
  return (
    <th scope="col" className={[className, align === "right" ? "text-right" : "text-left"].join(" ")}>
      <button
        type="button"
        onClick={onToggle}
        className={[
          "group inline-flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-semibold uppercase tracking-wide transition",
          align === "right" ? "ml-auto flex-row-reverse" : "",
          active
            ? isLight
              ? "text-[#111827]"
              : "text-zinc-100"
            : isLight
              ? "text-[#6B7280] hover:text-[#111827]"
              : "text-zinc-500 hover:text-zinc-200",
        ].join(" ")}
      >
        <span>{label}</span>
        <Arrow className={[active ? "" : "opacity-40 group-hover:opacity-70", "h-3.5 w-3.5"].join(" ")} aria-hidden />
      </button>
    </th>
  );
}
