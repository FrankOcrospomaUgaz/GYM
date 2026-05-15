import { Bell, Moon, Palette, Search, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApexTheme } from "../context/ThemeContext";

export function TopBar() {
  const { isLight, setMode } = useApexTheme();
  const { user } = useAuth();

  return (
    <header
      className={[
        "flex h-16 shrink-0 items-center gap-4 px-4 lg:px-6",
        isLight
          ? "border-b border-[#E5E7EB] bg-white shadow-sm"
          : "border-b border-white/[0.04] bg-[#000000]",
      ].join(" ")}
    >
      <div className="relative min-w-0 max-w-md flex-1">
        <Search
          className={[
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            isLight ? "text-[#9CA3AF]" : "text-zinc-500",
          ].join(" ")}
        />
        <input
          type="search"
          placeholder="Buscar"
          className={[
            "h-10 w-full rounded-xl pl-10 pr-20 text-sm outline-none",
            isLight
              ? "border border-[#E5E7EB] bg-white text-[#111827] placeholder:text-[#9CA3AF] ring-[#007BFF]/22 focus:ring-2"
              : "border border-white/[0.06] bg-[#121212] text-zinc-200 placeholder:text-zinc-600 ring-[#007BFF]/35 focus:ring-2",
          ].join(" ")}
        />
        <kbd
          className={[
            "pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-flex",
            isLight
              ? "border border-[#E5E7EB] bg-[#F3F4F6] text-[#6B7280]"
              : "border border-zinc-700 bg-zinc-800/80 text-zinc-500",
          ].join(" ")}
        >
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Link
          to="/proyectos"
          state={{ openProjectCreate: true }}
          className={[
            "hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition sm:inline-flex",
            isLight
              ? "bg-[#007BFF] text-white shadow-sm hover:bg-[#0063D5]"
              : "bg-[#007BFF] text-white shadow-[0_0_28px_rgba(0,123,255,0.45)] hover:brightness-110",
          ].join(" ")}
        >
          <span>+</span> Nuevo Proyecto
        </Link>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
          className={[
            "rounded-lg p-2 transition-colors",
            isLight
              ? "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
          ].join(" ")}
          title="Tema"
        >
          {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
        <button
          type="button"
          className={[
            "rounded-lg p-2 transition-colors",
            isLight
              ? "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
          ].join(" ")}
          title="Personalizar"
        >
          <Palette className="h-5 w-5" />
        </button>
        <button
          type="button"
          className={[
            "relative rounded-lg p-2 transition-colors",
            isLight
              ? "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
          ].join(" ")}
          title="Notificaciones"
        >
          <Bell className="h-5 w-5" />
            <span
            className={[
              "absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2",
              isLight ? "bg-[#007BFF] ring-white" : "bg-[#007BFF] ring-black",
            ].join(" ")}
          />
        </button>
        <div
          className={[
            "ml-1 flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold",
            isLight
              ? "border border-[#B3D9FF] bg-[#007BFF] text-white"
              : "border border-white/[0.1] bg-zinc-800 text-zinc-200",
          ].join(" ")}
        >
          {(user?.name ?? "U")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((x) => x[0]?.toUpperCase() ?? "")
            .join("")}
        </div>
      </div>
    </header>
  );
}
