import { Link, useLocation } from "wouter";
import { FileText, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/i18n";
import { useTranslation } from "@/i18n";

/**
 * Kompakta navigācijas karte ar saites uz Sistēmas informācija un Biznesa digitalizācija,
 * plus valodas pārslēdzis un tēmas izvēle.
 */
export function InfoNavCard() {
  const { t } = useTranslation();
  const [location] = useLocation();

  const linkClass = (href: string) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      location === href
        ? "text-primary bg-primary/10"
        : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
    }`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/50 dark:border-white/50 bg-card/80 backdrop-blur-sm p-3 shadow-lg shadow-black/5 dark:shadow-black/20 min-w-[200px]">
      <nav className="flex flex-col gap-0.5">
        <Link href="/info" className={linkClass("/info")}>
          <FileText className="w-4 h-4 text-primary/70 shrink-0" />
          {t("nav.systemInfo")}
        </Link>
        <Link href="/digitalization" className={linkClass("/digitalization")}>
          <TrendingUp className="w-4 h-4 text-primary/70 shrink-0" />
          {t("nav.businessDigitalization")}
        </Link>
      </nav>
      <div className="border-t border-border/50 dark:border-white/50 pt-2 flex items-center justify-between gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </div>
  );
}
