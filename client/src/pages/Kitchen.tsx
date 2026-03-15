import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, MapPin } from "lucide-react";
import { useLocationWithUrlSync } from "@/hooks/use-location-with-url-sync";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

export default function Kitchen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { locationId: selectedLocationId, setLocationId: setSelectedLocationId, locations, showLocationSelector } = useLocationWithUrlSync();
  const currentLocation = locations?.find((l) => l.id === selectedLocationId);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager", "kitchen_staff"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("kitchen.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.kitchenDesc")}</p>
        </div>

        {showLocationSelector && locations?.length ? (
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
        ) : currentLocation ? (
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1.5 gap-1.5 rounded-lg"
          >
            <MapPin className="w-3.5 h-3.5" />
            {currentLocation.name}
          </Badge>
        ) : null}

        <div className="flex gap-2">
          <Button
            onClick={() => window.open(`/kitchen/view?locationId=${selectedLocationId}`, "_blank")}
            className="gap-2"
            disabled={!selectedLocationId}
          >
            <ExternalLink className="h-4 w-4" />
            {t("dashboard.openKitchen")}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedLocationId}
            onClick={() => {
              const url = `${window.location.origin}/kitchen/view?locationId=${selectedLocationId}`;
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
