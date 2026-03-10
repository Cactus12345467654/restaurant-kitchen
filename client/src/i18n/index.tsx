import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { lv, type TranslationKey } from "./translations/lv";
import { en } from "./translations/en";

type Lang = "lv" | "en";

const translations: Record<Lang, Record<TranslationKey, string>> = { lv, en };

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "brio-lang";

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "lv") return stored;
  } catch {}
  return "lv";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? translations.lv[key] ?? key,
    [lang],
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within LanguageProvider");
  return ctx;
}

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation();
  return (
    <div className="inline-flex items-center rounded-md border border-border/50 text-xs overflow-hidden">
      <button
        onClick={() => setLang("lv")}
        className={`px-2 py-1 transition-colors ${
          lang === "lv"
            ? "bg-primary text-primary-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        }`}
      >
        LV
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-2 py-1 transition-colors ${
          lang === "en"
            ? "bg-primary text-primary-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        }`}
      >
        EN
      </button>
    </div>
  );
}
