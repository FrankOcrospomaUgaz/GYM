import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";
import { useApexTheme } from "../context/ThemeContext";

export function ApexLayout() {
  const { isLight } = useApexTheme();
  return (
    <div
      className={[
        "flex h-full min-h-screen w-full flex-col",
        isLight ? "bg-[#F9FAFB]" : "bg-[#000000]",
      ].join(" ")}
    >
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <Outlet />
        </div>
      </div>
    </div>
  );
}
