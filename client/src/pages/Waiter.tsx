import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, MapPin } from "lucide-react";
import { useAuth, canSelectLocation, hasRole } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

export default function Waiter() {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const isSuperAdmin = hasRole(user, "super_admin");
  const showLocationSelector = canSelectLocation(user);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    isSuperAdmin ? null : (canSelectLocation(user) ? null : (user?.locationId ?? null)),
  );
  const { t } = useTranslation();
  const { toast } = useToast();

  useEffect(() => {
    if (isSuperAdmin && locations?.length && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    } else if (showLocationSelector && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    }
  }, [isSuperAdmin, showLocationSelector, locations, selectedLocationId]);

  const currentLocation = locations?.find((l) => l.id === selectedLocationId);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager", "waiter"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Viesmīļa ekrāns</h1>
          <p className="text-muted-foreground mt-1">Šeit būs viesmīļa darba vide.</p>
        </div>

        {showLocationSelector && locations?.length ? (
          <Select
            value={selectedLocationId?.toString() ?? ""}
            onValueChange={(v) => setSelectedLocationId(Number(v))}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder={t("waiter.selectLocation")} />
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
            onClick={() => window.open(`/waiter/view?locationId=${selectedLocationId}`, "_blank")}
            className="gap-2"
            disabled={!selectedLocationId}
          >
            <ExternalLink className="h-4 w-4" />
            Atvērt viesmīļa logu
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedLocationId}
            onClick={() => {
              const url = `${window.location.origin}/waiter/view?locationId=${selectedLocationId}`;
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
