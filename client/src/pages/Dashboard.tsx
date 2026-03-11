import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, canSelectLocation } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConciergeBell,
  ChefHat,
  ExternalLink,
  ShoppingBag,
  CalendarDays,
  TrendingUp,
  MapPin,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();

  const assignedLocationId = user?.locationId ?? null;
  const showLocationSelector = canSelectLocation(user);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    showLocationSelector ? null : assignedLocationId,
  );

  useEffect(() => {
    if (!showLocationSelector && assignedLocationId) {
      setSelectedLocationId(assignedLocationId);
    }
    if (showLocationSelector && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    }
  }, [showLocationSelector, assignedLocationId, locations, selectedLocationId]);

  const currentLocation = locations?.find((l) => l.id === selectedLocationId);

  const { data: allOrders } = useQuery<any[]>({
    queryKey: ["/api/orders", selectedLocationId],
    queryFn: async () => {
      const url = selectedLocationId
        ? `/api/orders?locationId=${selectedLocationId}`
        : "/api/orders";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedLocationId,
    refetchInterval: 30_000,
  });

  const stats = useMemo(() => {
    if (!allOrders?.length) return { today: 0, week: 0, avgBasket: "0.00" };

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    let todayCount = 0;
    let todayRevenueCents = 0;
    let weekCount = 0;

    for (const o of allOrders) {
      const d = new Date(o.createdAt ?? o.created_at);
      if (d >= startOfWeek) weekCount++;
      if (d >= startOfDay) {
        todayCount++;
        todayRevenueCents += o.totalPriceCents ?? o.total_price_cents ?? 0;
      }
    }

    const avg = todayCount > 0 ? (todayRevenueCents / 100 / todayCount).toFixed(2) : "0.00";
    return { today: todayCount, week: weekCount, avgBasket: avg };
  }, [allOrders]);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header + Location control */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {canSelectLocation(user)
                ? t("dashboard.overviewAll")
                : t("dashboard.overviewLocation")}
            </p>
          </div>

          {showLocationSelector ? (
            <Select
              value={selectedLocationId?.toString() ?? ""}
              onValueChange={(v) => setSelectedLocationId(Number(v))}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={t("dashboard.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                {(locations ?? []).map((loc) => (
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
        </div>

        {/* Workspace cards */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            {t("dashboard.workspaces")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Waiter workspace */}
            <Card className="p-6 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <ConciergeBell className="w-16 h-16 text-primary" />
              </div>
              <div className="relative z-10 space-y-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground">
                    {t("dashboard.waiterScreen")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("dashboard.waiterDesc")}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    window.open(
                      `/waiter/view?locationId=${selectedLocationId}`,
                      "_blank",
                    )
                  }
                  disabled={!selectedLocationId}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("dashboard.openWaiter")}
                </Button>
              </div>
            </Card>

            {/* Kitchen workspace */}
            <Card className="p-6 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <ChefHat className="w-16 h-16 text-orange-500" />
              </div>
              <div className="relative z-10 space-y-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground">
                    {t("dashboard.kitchenScreen")}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("dashboard.kitchenDesc")}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    window.open(`/kitchen/view?locationId=${selectedLocationId}`, "_blank")
                  }
                  disabled={!selectedLocationId}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("dashboard.openKitchen")}
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Live statistics */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            {t("dashboard.statistics")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <ShoppingBag className="w-12 h-12 text-blue-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  {t("dashboard.ordersToday")}
                </p>
                <h3 className="text-3xl font-display font-bold text-foreground">
                  {stats.today}
                </h3>
              </div>
            </Card>

            <Card className="p-5 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CalendarDays className="w-12 h-12 text-orange-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  {t("dashboard.ordersThisWeek")}
                </p>
                <h3 className="text-3xl font-display font-bold text-foreground">
                  {stats.week}
                </h3>
              </div>
            </Card>

            <Card className="p-5 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="w-12 h-12 text-emerald-500" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                  {t("dashboard.avgBasketSize")}
                </p>
                <h3 className="text-3xl font-display font-bold text-foreground">
                  &euro;{stats.avgBasket}
                </h3>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
