import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useAuth, canSelectLocation } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/i18n";

export default function Kitchen() {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    canSelectLocation(user) ? null : (user?.locationId ?? null),
  );
  const { t } = useTranslation();

  useEffect(() => {
    if (canSelectLocation(user) && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    }
  }, [user, locations, selectedLocationId]);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager", "kitchen_staff"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Virtuves ekrāns</h1>
          <p className="text-muted-foreground mt-1">Šeit būs virtuves darba vide.</p>
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

        <Button
          onClick={() => window.open(`/kitchen/view?locationId=${selectedLocationId}`, "_blank")}
          className="gap-2"
          disabled={!selectedLocationId}
        >
          <ExternalLink className="h-4 w-4" />
          Atvērt virtuves logu
        </Button>
      </div>
    </ProtectedRoute>
  );
}
