import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const resolvedPlaceholder = placeholder ?? emptyOption?.label ?? "Escriba para buscar...";

  const selected = useMemo(() => {
    if (emptyOption && String(emptyOption.value) === String(value)) return emptyOption;
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

  const pick = (next: string) => {
    onChange(next);
    closePicker();
    requestAnimationFrame(() => inputRef.current?.blur());
  };

  const selectOption = (next: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    pick(next);
  };

  useEffect(() => {
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      closePicker();
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, []);

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
          if (event.key === "Enter" && open && filtered[0]) {
            event.preventDefault();
            pick(filtered[0].value);
          }
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
      />
      <input type="hidden" value={value} required={required} readOnly tabIndex={-1} aria-hidden className="hidden" />
      {open ? (
        <ul
          ref={listRef}
          className="absolute z-[80] mt-1 max-h-56 w-full overflow-y-auto overscroll-contain rounded-2xl border border-zinc-200 bg-white py-1 shadow-xl"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filtered.length ? (
            filtered.map((item) => {
              const isSelected = String(item.value) === String(value);
              return (
                <li key={`${item.value}::${item.label}`}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left text-sm font-semibold touch-manipulation active:bg-[#ffcc00]/40 ${isSelected ? "bg-[#ffcc00]/30" : "hover:bg-[#ffcc00]/20"}`}
                    onPointerDown={(event) => selectOption(item.value, event)}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })
          ) : (
            <li className="px-4 py-3 text-sm font-semibold text-zinc-500">Sin coincidencias</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
