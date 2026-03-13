import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStoredTheme,
  setStoredTheme,
  type Theme,
} from "@/lib/theme";

export function NumberDisplayThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    getStoredTheme("orderNumbers")
  );

  useEffect(() => {
    setTheme(getStoredTheme("orderNumbers"));
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "orderNumbersTheme" && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setStoredTheme("orderNumbers", next);
    setTheme(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:border-white/50"
      aria-label={theme === "dark" ? "Pārslēgt numuru ekrānu uz gaišo" : "Pārslēgt numuru ekrānu uz tumšo"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
