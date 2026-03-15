import { useQuery } from "@tanstack/react-query";

export interface ActiveChef {
  userId: number;
  username: string;
}

export function useActiveChefs(locationId: number | null, refetchInterval = 10000) {
  return useQuery<ActiveChef[]>({
    queryKey: ["time-tracking-active-chefs", locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const res = await fetch(`/api/time-tracking/active-chefs?locationId=${locationId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!locationId,
    refetchInterval,
  });
}
