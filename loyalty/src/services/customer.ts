/**
 * Customer service — API calls for the authenticated customer's profile and QR.
 * Each function maps 1:1 to a backend endpoint.
 */
import { apiClient } from "@/api/client";
import type { CustomerMe } from "@/api/types";

// Stable query key used by useCustomer and auth service to share cached data.
export const CUSTOMER_ME_KEY = ["/customer/me"] as const;

// ── Profile ─────────────────────────────────────────────────────────────────

export function fetchCustomerMe(): Promise<CustomerMe> {
  return apiClient.get<CustomerMe>("/customer/me");
}

export function updateCustomerMe(
  updates: Partial<Pick<CustomerMe, "displayName" | "preferredLanguage">>,
): Promise<CustomerMe> {
  return apiClient.patch<CustomerMe>("/customer/me", updates);
}

export function updateMarketingConsent(consent: boolean): Promise<CustomerMe> {
  return apiClient.patch<CustomerMe>("/customer/me", {
    profile: { marketingConsent: consent },
  });
}

// ── QR ──────────────────────────────────────────────────────────────────────

/** Returns the QR image as a Blob (use URL.createObjectURL to render). */
export function fetchQrImage(): Promise<Blob> {
  return fetch("/api/customer/me/qr", { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch QR");
    return r.blob();
  });
}

/** Rotates the QR token. Old token is immediately invalid. */
export function rotateQrToken(): Promise<CustomerMe> {
  return apiClient.post<CustomerMe>("/customer/me/qr/rotate");
}
