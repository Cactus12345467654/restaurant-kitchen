import { useContext } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeContext } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return null;

  const { theme, toggleTheme } = ctx;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:border-white/50"
      aria-label={theme === "dark" ? "Pārslēgt uz light mode" : "Pārslēgt uz dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
