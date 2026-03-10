import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";

export default function StatisticsLanding() {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    !hasRole(user, "super_admin") && user?.locationId ? user.locationId : null,
  );
  const { t } = useTranslation();

  useEffect(() => {
    if (hasRole(user, "super_admin") && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    } else if (
      !hasRole(user, "super_admin") &&
      user?.locationId &&
      selectedLocationId !== user.locationId
    ) {
      setSelectedLocationId(user.locationId);
    }
  }, [user, locations, selectedLocationId]);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("stats.screenTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("stats.screenSubtitle")}</p>
        </div>

        {hasRole(user, "super_admin") && locations && locations.length > 0 && (
          <Select
            value={selectedLocationId?.toString() ?? ""}
            onValueChange={(v) => setSelectedLocationId(Number(v))}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder={t("dashboard.selectLocation")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id.toString()}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          onClick={() =>
            window.open(`/statistics/view?locationId=${selectedLocationId}`, "_blank")
          }
          className="gap-2"
          disabled={!selectedLocationId}
        >
          <ExternalLink className="h-4 w-4" />
          {t("stats.openWindow")}
        </Button>
      </div>
    </ProtectedRoute>
  );
}
