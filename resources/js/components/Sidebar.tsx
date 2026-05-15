import {
  type LucideIcon,
  BarChart3,
  Briefcase,
  ClipboardList,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  Layers,
  LogOut,
  Plug,
  Radar,
  Receipt,
  Settings2,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useApexTheme } from "../context/ThemeContext";

type NavLink = { label: string; to: string; icon: LucideIcon };

function linkClass(loc: ReturnType<typeof useLocation>, path: string, isLight: boolean): string {
  const active = loc.pathname === path || (path !== "/" && loc.pathname.startsWith(path + "/"));
  return [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? isLight
        ? "bg-[#007BFF]/12 text-[#007BFF]"
        : "bg-[#0a2744] text-[#7AB8FF] shadow-[0_0_20px_rgba(0,123,255,0.18)]"
      : isLight
        ? "text-[#94A3B8] hover:bg-white/5 hover:text-[#E2E8F0]"
        : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
  ].join(" ");
}

function NavSection({ title, items, isLight }: { title: string; items: NavLink[]; isLight: boolean }) {
  const loc = useLocation();

  return (
    <div className="mb-6">
      <p
        className={[
          "px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider",
          isLight ? "text-[#64748B]" : "text-zinc-500",
        ].join(" ")}
      >
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.to} to={item.to} className={linkClass(loc, item.to, isLight)}>
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const { isLight } = useApexTheme();
  const { user, isSuperadmin, logout } = useAuth();
  const loc = useLocation();

  const crm: NavLink[] = [
    { label: "Clientes", to: "/clientes", icon: Briefcase },
    { label: "Oportunidades", to: "/oportunidades", icon: Target },
    { label: "Cotizaciones", to: "/cotizaciones", icon: ClipboardList },
  ];
  const ops: NavLink[] = [
    { label: "Proyectos", to: "/proyectos", icon: FolderKanban },
    { label: "Tiempos", to: "/tiempos", icon: Radar },
    { label: "Documentos", to: "/documentos", icon: FileText },
  ];
  const finances: NavLink[] = [{ label: "Finanzas", to: "/finanzas", icon: Landmark }];
  const analytic: NavLink[] = [
    { label: "Rentabilidad", to: "/rentabilidad", icon: Receipt },
    { label: "Reportes gerenciales", to: "/reportes", icon: BarChart3 },
  ];

  const admin: NavLink[] = [
    { label: "Áreas", to: "/areas", icon: Layers },
    { label: "Catálogos", to: "/admin/catalogos", icon: Settings2 },
    { label: "Integraciones", to: "/integraciones", icon: Plug },
    { label: "Usuarios", to: "/usuarios", icon: Users },
  ];

  const dashActive = loc.pathname === "/";

  return (
    <aside className={"flex h-full w-[260px] shrink-0 flex-col border-r border-white/[0.04] bg-[#000000]"}>
      <div className={"flex h-16 items-center gap-2 border-b px-4 border-white/[0.04]"}>
        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isLight ? "bg-[#007BFF]/14 text-[#007BFF]" : "bg-[#0a2744] text-[#7AB8FF]",
          ].join(" ")}
        >
          <Zap className={["h-5 w-5", isLight ? "fill-[#007BFF]" : "fill-[#7AB8FF]"].join(" ")} />
        </div>
        <div className="leading-tight">
          <p className={["text-[10px] font-medium uppercase tracking-[0.2em]", isLight ? "text-[#64748B]" : "text-zinc-500"].join(" ")}>Xpande Corp</p>
          <p className={["text-sm font-bold tracking-wide", isLight ? "text-white" : "text-zinc-100"].join(" ")}>Intranet</p>
        </div>
      </div>

      <div className={["min-h-0 flex-1 overflow-y-auto px-2 py-4", isLight ? "apex-sidebar-scroll--light" : "apex-sidebar-scroll--dark"].join(" ")}>
        <div className="mb-6">
          <p className={["px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider", isLight ? "text-[#64748B]" : "text-zinc-500"].join(" ")}>Corp</p>
          <nav className="space-y-0.5">
            <Link
              to="/"
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                dashActive
                  ? isLight
                    ? "bg-[#007BFF]/12 text-[#007BFF]"
                    : "bg-[#0a2744] text-[#7AB8FF] shadow-[0_0_20px_rgba(0,123,255,0.18)]"
                  : isLight
                    ? "text-[#94A3B8] hover:bg-white/5 hover:text-[#E2E8F0]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
              ].join(" ")}
            >
              <LayoutDashboard className="h-[18px] w-[18px] shrink-0 opacity-90" />
              <span className="flex-1">Panel general</span>
            </Link>
          </nav>
        </div>

        <NavSection title="CRM" items={crm} isLight={isLight} />
        <NavSection title="Operaciones" items={ops} isLight={isLight} />
        <NavSection title="Finanzas" items={finances} isLight={isLight} />
        <NavSection title="Analítica" items={analytic} isLight={isLight} />
        {isSuperadmin ? <NavSection title="Administración" items={admin} isLight={isLight} /> : null}
      </div>

      <div className={"border-t border-white/[0.04] p-3"}>
        <div className={["flex items-center gap-3 rounded-xl p-2", isLight ? "bg-[#1E293B]/60" : "bg-white/[0.03]"].join(" ")}>
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold",
              isLight ? "bg-[#007BFF] text-white" : "bg-[#007BFF] text-white shadow-[0_0_18px_rgba(0,123,255,0.35)]",
            ].join(" ")}
          >
            {(user?.name ?? "U")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((x) => x[0]?.toUpperCase() ?? "")
              .join("")}
          </div>
          <div className="min-w-0 flex-1">
            <p className={["truncate text-sm font-medium", isLight ? "text-[#F1F5F9]" : "text-zinc-200"].join(" ")}>
              {user?.name ?? "Usuario"}
            </p>
            <p className={["text-xs", isLight ? "text-[#94A3B8]" : "text-zinc-500"].join(" ")}>
              {user?.role_name ?? (user?.is_superadmin ? "Superadmin" : "Colaborador")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className={[
              "rounded-lg p-2 transition-colors",
              isLight ? "text-[#94A3B8] hover:bg-white/10 hover:text-[#E2E8F0]" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
            ].join(" ")}
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
