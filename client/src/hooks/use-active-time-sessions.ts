import { useQuery } from "@tanstack/react-query";

export interface ActiveTimeSession {
  id: number;
  userId: number;
  locationId: number;
  startedAt: string;
  endedAt: string | null;
  pausedAt: string | null;
  totalPauseMinutes: number;
  username: string;
}

export function useActiveTimeSessions(locationId: number | null, refetchInterval = 5000) {
  return useQuery<ActiveTimeSession[]>({
    queryKey: ["time-tracking-active", locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const res = await fetch(`/api/time-tracking/active?locationId=${locationId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!locationId,
    refetchInterval,
  });
}
