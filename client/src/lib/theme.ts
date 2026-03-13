/**
 * Theme system – atsevišķi stāvokļi katram modulim.
 * dashboardTheme, kitchenTheme, waiterTheme – saglabāti localStorage.
 */

export type Theme = "dark" | "light";

export type ThemeModule = "dashboard" | "kitchen" | "waiter" | "orderNumbers";

const STORAGE_KEYS: Record<ThemeModule, string> = {
  dashboard: "dashboardTheme",
  kitchen: "kitchenTheme",
  waiter: "waiterTheme",
  orderNumbers: "orderNumbersTheme",
};

const DEFAULT_THEME: Theme = "dark";

export function getStoredTheme(module: ThemeModule): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS[module]);
    if (stored === "light" || stored === "dark") return stored;
  } catch (_) {}
  return DEFAULT_THEME;
}

export function setStoredTheme(module: ThemeModule, theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEYS[module], theme);
  } catch (_) {}
}

export function getStorageKey(module: ThemeModule): string {
  return STORAGE_KEYS[module];
}

/**
 * Nosaka moduli no path.
 * /kitchen/view -> kitchen (virtuves ekrāns atsevišķā logā)
 * /waiter/view -> waiter (viesmīļa panelis atsevišķā logā)
 * pārējie (/, /kitchen, /waiter, /login, utt.) -> dashboard
 */
export function getModuleFromPath(path: string): ThemeModule {
  if (path.startsWith("/kitchen/view")) return "kitchen";
  if (path.startsWith("/waiter/view")) return "waiter";
  if (path.startsWith("/order-numbers/view")) return "orderNumbers";
  return "dashboard";
}
