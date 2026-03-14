/**
 * Authentication service for the loyalty app.
 *
 * Supported flow (MVP):
 *   Google Identity Services → ID token → POST /api/auth/google → session cookie
 *
 * The session lives in an HttpOnly cookie managed by the backend.
 * The frontend never stores a token; it relies on the cookie for all API calls.
 */
import { apiClient } from "@/api/client";
import type { CustomerMe } from "@/api/types";
import type { QueryClient } from "@tanstack/react-query";
import { CUSTOMER_ME_KEY } from "@/services/customer";

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
export const BETA_ACCESS = import.meta.env.VITE_BETA_ACCESS === "true";
/** Testa režīms: VITE_BETA_ACCESS=true VAI lokālā izstrāde (npm run dev) */
export const CAN_USE_TEST_MODE = BETA_ACCESS || import.meta.env.DEV;

// ── Google sign-in ──────────────────────────────────────────────────────────

/**
 * Exchange a Google ID token for a customer session.
 * On success, updates the React Query cache so all hooks reflect the new state immediately.
 */
export async function loginWithGoogle(
  credential: string,
  queryClient: QueryClient,
): Promise<CustomerMe> {
  const customer = await apiClient.post<CustomerMe>("/auth/google", { credential });
  queryClient.setQueryData(CUSTOMER_ME_KEY, customer);
  return customer;
}

/** Development-only: log in as test customer (no Google OAuth). */
export async function loginWithDev(queryClient: QueryClient): Promise<CustomerMe> {
  const customer = await apiClient.post<CustomerMe>("/auth/customer/dev-login", {});
  queryClient.setQueryData(CUSTOMER_ME_KEY, customer);
  return customer;
}

// ── Session logout ──────────────────────────────────────────────────────────

export async function logout(queryClient: QueryClient): Promise<void> {
  await apiClient.post("/auth/customer/logout");
  queryClient.setQueryData(CUSTOMER_ME_KEY, null);
  queryClient.clear();
}

// ── Google Identity Services script loader ──────────────────────────────────

/**
 * Injects the Google Identity Services script once.
 * Safe to call multiple times — only loads the script on first call.
 */
export function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (document.querySelector('script[src*="accounts.google.com/gsi"]')) return resolve();

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity script"));
    document.head.appendChild(script);
  });
}
