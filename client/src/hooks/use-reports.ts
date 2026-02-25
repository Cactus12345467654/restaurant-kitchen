import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type ReportOverview = z.infer<typeof api.reports.overview.responses[200]>;

export function useReports(locationId?: number | null) {
  return useQuery<ReportOverview>({
    queryKey: [api.reports.overview.path, locationId],
    queryFn: async () => {
      let url = api.reports.overview.path;
      if (locationId) {
        url += `?locationId=${locationId}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });
}
