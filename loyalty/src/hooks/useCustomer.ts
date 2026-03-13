/**
 * React Query hook — authenticated customer profile + loyalty snapshot.
 * Returns null when no session is active (used by RequireAuth).
 */
import { useQuery } from "@tanstack/react-query";
import { fetchCustomerMe, CUSTOMER_ME_KEY } from "@/services/customer";
import { ApiError } from "@/api/client";
import type { CustomerMe } from "@/api/types";

export type { CustomerMe };

export function useCustomer() {
  return useQuery<CustomerMe | null>({
    queryKey: CUSTOMER_ME_KEY,
    queryFn: async () => {
      try {
        return await fetchCustomerMe();
      } catch (err) {
        if (err instanceof ApiError && err.isUnauthorized) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}
