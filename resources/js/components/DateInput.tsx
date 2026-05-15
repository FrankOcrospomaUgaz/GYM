import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { useEffect, useMemo, useRef, useState } from "react";

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className: string;
  isLight: boolean;
  required?: boolean;
};

export function DateInput({ value, onChange, className, isLight, required }: DateInputProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => {
    if (!value) {
      return undefined;
    }
    try {
      return parseISO(value);
    } catch {
      return undefined;
    }
  }, [value]);

  const displayValue = selected ? format(selected, "dd/MM/yyyy", { locale: es }) : "";

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      const node = wrapRef.current;
      if (node && !node.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        readOnly
        required={required}
        value={displayValue}
        placeholder="dd/mm/aaaa"
        onClick={() => setOpen(true)}
        className={className + " pr-10"}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 transition hover:bg-black/10 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
        aria-label="Abrir calendario"
      >
        <CalendarDays className="h-4 w-4" />
      </button>
      {open ? (
        <div
          className={[
            "absolute left-0 top-[calc(100%+8px)] z-[130] rounded-xl border p-3 shadow-2xl",
            isLight ? "border-[#E5E7EB] bg-white" : "border-white/[0.1] bg-[#161616]",
          ].join(" ")}
        >
          <DayPicker
            mode="single"
            locale={es}
            selected={selected}
            onSelect={(date) => {
              if (!date) {
                onChange("");
                return;
              }
              onChange(format(date, "yyyy-MM-dd"));
              setOpen(false);
            }}
            showOutsideDays
            classNames={{
              caption: "flex items-center justify-between mb-2 px-1",
              nav: "flex items-center gap-1",
              button_previous:
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10",
              button_next:
                "inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10",
              month_caption: isLight ? "text-sm font-semibold text-[#111827]" : "text-sm font-semibold text-zinc-100",
              weekdays: "grid grid-cols-7",
              weekday:
                "h-8 w-8 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400",
              month_grid: "mt-1",
              weeks: "space-y-1",
              week: "grid grid-cols-7 gap-0.5",
              day: "h-8 w-8",
              day_button:
                "h-8 w-8 rounded-md text-sm text-zinc-700 transition hover:bg-black/10 dark:text-zinc-200 dark:hover:bg-white/10",
              selected:
                "bg-[#007BFF] text-white hover:bg-[#0063D5] dark:bg-[#007BFF] dark:text-white dark:hover:brightness-110",
              today: "ring-1 ring-[#007BFF]/55",
              outside: "text-zinc-400 dark:text-zinc-600",
            }}
            components={{
              Chevron: ({ orientation, ...props }) =>
                orientation === "left" ? <ChevronLeft className="h-4 w-4" {...props} /> : <ChevronRight className="h-4 w-4" {...props} />,
            }}
          />
          <div className={["mt-2 flex items-center justify-between border-t pt-2", isLight ? "border-[#E5E7EB]" : "border-white/[0.08]"].join(" ")}>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

