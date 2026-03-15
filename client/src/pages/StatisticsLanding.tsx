import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy } from "lucide-react";
import { useLocationWithUrlSync } from "@/hooks/use-location-with-url-sync";
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { locationId: selectedLocationId, setLocationId: setSelectedLocationId, locations, showLocationSelector } = useLocationWithUrlSync();

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("stats.screenTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("stats.screenSubtitle")}</p>
        </div>

        {showLocationSelector && locations && locations.length > 0 && (
          <Select
            value={selectedLocationId?.toString() ?? ""}
            onValueChange={(v) => setSelectedLocationId(v ? Number(v) : null)}
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
