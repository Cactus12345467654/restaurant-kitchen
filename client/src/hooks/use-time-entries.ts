import { useQuery } from "@tanstack/react-query";

export interface TimeEntryRow {
  id: number;
  userId: number;
  locationId: number;
  startedAt: string;
  endedAt: string | null;
  pausedAt: string | null;
  totalPauseMinutes: number;
  username: string;
}

export function useTimeEntries(locationId: number | null, year: number, month: number) {
  return useQuery<TimeEntryRow[]>({
    queryKey: ["time-entries", locationId, year, month],
    queryFn: async () => {
      if (!locationId) return [];
      const res = await fetch(
        `/api/time-tracking/entries?locationId=${locationId}&year=${year}&month=${month}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!locationId,
  });
}
