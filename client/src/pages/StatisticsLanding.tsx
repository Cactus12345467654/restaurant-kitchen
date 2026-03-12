import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { useAuth, canSelectLocation } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

export default function StatisticsLanding() {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    canSelectLocation(user) ? null : (user?.locationId ?? null),
  );
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    if (canSelectLocation(user) && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    } else if (
      !canSelectLocation(user) &&
      user?.locationId &&
      selectedLocationId !== user.locationId
    ) {
      setSelectedLocationId(user.locationId);
    }
  }, [user, locations, selectedLocationId]);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("stats.screenTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("stats.screenSubtitle")}</p>
        </div>

        {canSelectLocation(user) && locations && locations.length > 0 && (
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

        <div className="flex gap-2">
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
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedLocationId}
            onClick={() => {
              const url = `${window.location.origin}/statistics/view?locationId=${selectedLocationId}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: t("common.linkCopied") }));
            }}
          >
            <Copy className="h-4 w-4" />
            {t("common.copyLink")}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
