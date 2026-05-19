import { useEffect, useMemo, useRef, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyOption?: SearchableSelectOption;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

const MAX_RESULTS = 80;

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Escriba para buscar...",
  emptyOption,
  required,
  disabled,
  className = "",
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const selected = useMemo(() => {
    if (emptyOption && String(emptyOption.value) === String(value)) return emptyOption;
    return options.find((item) => String(item.value) === String(value)) ?? null;
  }, [options, value, emptyOption]);

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    const pool = emptyOption ? [emptyOption, ...options] : options;
    if (!q) return pool.slice(0, MAX_RESULTS);
    return pool.filter((item) => item.label.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
  }, [options, emptyOption, text]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) setText(selected?.label ?? "");
  }, [open, selected?.label]);

  const pick = (next: string) => {
    onChange(next);
    const item =
      (emptyOption && String(emptyOption.value) === String(next) ? emptyOption : null) ??
      options.find((option) => String(option.value) === String(next)) ??
      null;
    setText(item?.label ?? "");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        disabled={disabled}
        className={className}
        placeholder={placeholder}
        value={open ? text : (selected?.label ?? "")}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setText(selected?.label ?? "");
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        autoComplete="off"
      />
      <input type="hidden" value={value} required={required} readOnly tabIndex={-1} aria-hidden className="hidden" />
      {open ? (
        <ul className="absolute z-[80] mt-1 max-h-56 w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white py-1 shadow-xl">
          {filtered.length ? (
            filtered.map((item) => (
              <li key={`${item.value}::${item.label}`}>
                <button
                  type="button"
                  className={`w-full px-4 py-2.5 text-left text-sm font-semibold hover:bg-[#ffcc00]/20 ${String(item.value) === String(value) ? "bg-[#ffcc00]/30" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(item.value)}
                >
                  {item.label}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm font-semibold text-zinc-500">Sin coincidencias</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

