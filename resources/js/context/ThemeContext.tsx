import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ApexThemeMode = "dark" | "light";

type ApexThemeContextValue = {
  mode: ApexThemeMode;
  setMode: React.Dispatch<React.SetStateAction<ApexThemeMode>>;
  isLight: boolean;
};

const ApexThemeContext = createContext<ApexThemeContextValue | null>(null);

export function ApexThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ApexThemeMode>("dark");
  const isLight = mode === "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-apex-theme", mode);
  }, [mode]);

  return (
    <ApexThemeContext.Provider value={{ mode, setMode, isLight }}>{children}</ApexThemeContext.Provider>
  );
}

export function useApexTheme() {
  const ctx = useContext(ApexThemeContext);
  if (!ctx) {
    throw new Error("useApexTheme debe usarse dentro de ApexThemeProvider");
  }
  return ctx;
}
