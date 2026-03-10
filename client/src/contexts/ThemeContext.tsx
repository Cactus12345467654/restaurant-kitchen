import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import {
  getModuleFromPath,
  getStoredTheme,
  setStoredTheme,
  type Theme,
  type ThemeModule,
} from "@/lib/theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeContextValue {
  theme: Theme;
  module: ThemeModule;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const path = typeof location === "string" ? location : "/";
  const module = getModuleFromPath(path);
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(module)
  );

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setStoredTheme(module, newTheme);
      setThemeState(newTheme);
      applyTheme(newTheme);
    },
    [module]
  );

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
  }, [theme, setTheme]);

  useEffect(() => {
    const stored = getStoredTheme(module);
    setThemeState(stored);
    applyTheme(stored);
  }, [module]);

  const value: ThemeContextValue = {
    theme,
    module,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
