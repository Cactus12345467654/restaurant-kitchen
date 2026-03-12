import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth, canSelectLocation, hasRole } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useLocationModifierGroups } from "@/hooks/use-menu";
import { useTranslation } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Modifiers() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();
  const isSuperAdmin = hasRole(user, "super_admin");
  const showLocationSelector = canSelectLocation(user);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    isSuperAdmin ? null : (canSelectLocation(user) ? null : (user?.locationId ?? null)),
  );

  useEffect(() => {
    if (isSuperAdmin && locations?.length && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    } else if (showLocationSelector && locations?.length && selectedLocationId == null) {
      setSelectedLocationId(locations[0].id);
    }
  }, [isSuperAdmin, showLocationSelector, locations, selectedLocationId]);

  const { data: groups = [], isLoading } = useLocationModifierGroups(selectedLocationId);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("modifiersLib.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("modifiersLib.subtitle")}
            </p>
          </div>

          {showLocationSelector && locations && locations.length > 0 && (
            <Select
              value={selectedLocationId != null ? String(selectedLocationId) : ""}
              onValueChange={(val) => setSelectedLocationId(Number(val))}
            >
              <SelectTrigger className="w-[220px] bg-black/20 border-border/50">
                <SelectValue placeholder={t("modifiersLib.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-sm">{t("modifiersLib.loading")}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm italic">
              {t("modifiersLib.empty")}
            </p>
            <p className="text-xs mt-1">
              {t("modifiersLib.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group: any) => {
              const active = group.isActive !== false;
              return (
                <Card
                  key={group.id}
                  className={`border-border/50 hover:border-border transition-colors ${!active ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-5 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.optionsCount ?? 0}{" "}
                        {(group.optionsCount ?? 0) === 1 ? t("modifiersLib.option") : t("modifiersLib.options")}
                      </p>
                    </div>
                    <Badge variant={active ? "default" : "secondary"} className="shrink-0 text-xs">
                      {active ? t("modifiersLib.active") : t("modifiersLib.inactive")}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
