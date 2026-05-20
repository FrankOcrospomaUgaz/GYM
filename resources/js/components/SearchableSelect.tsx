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
  placeholder,
  emptyOption,
  required,
  disabled,
  className = "",
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const resolvedPlaceholder = placeholder ?? emptyOption?.label ?? "Escriba para buscar...";

  const selected = useMemo(() => {
    if (emptyOption && String(emptyOption.value) === String(value)) return null;
    if (value === "" || value == null) return null;
    return options.find((item) => String(item.value) === String(value)) ?? null;
  }, [options, value, emptyOption]);

  const closedLabel = selected?.label ?? "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = emptyOption ? [emptyOption, ...options] : options;
    if (!q) return pool.slice(0, MAX_RESULTS);
    return pool.filter((item) => item.label.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
  }, [options, emptyOption, query]);

  const beginSearch = () => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
  };

  const closePicker = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closePicker();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (next: string) => {
    onChange(next);
    closePicker();
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        className={className}
        placeholder={resolvedPlaceholder}
        value={open ? query : closedLabel}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={beginSearch}
        onClick={beginSearch}
        onKeyDown={(event) => {
          if (event.key === "Escape") closePicker();
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
