import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth, canSelectLocation, hasRole } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { OrdersStatisticsPage } from "./statistics/OrdersStatisticsPage";
import { ChartReportPage } from "./statistics/ChartReportPage";
import { ProductMonthlyTableReport } from "./statistics/ProductMonthlyTableReport";

function StatsProductsTab() {
  const { t } = useTranslation();
  return (
    <Card className="p-8 bg-card border-border/50 dark:border-white/50 rounded-2xl">
      <h2 className="text-xl font-display font-semibold text-foreground">
        {t("stats.tabProducts")}
      </h2>
    </Card>
  );
}

function StatsModifiersTab() {
  const { t } = useTranslation();
  return (
    <Card className="p-8 bg-card border-border/50 dark:border-white/50 rounded-2xl">
      <h2 className="text-xl font-display font-semibold text-foreground">
        {t("stats.tabModifiers")}
      </h2>
    </Card>
  );
}

export default function Statistics() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: locations } = useLocations();

  const assignedLocationId = user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;
  const isSuperAdmin = hasRole(user, "super_admin");
  const showSelector = canSelectLocation(user);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    isSuperAdmin ? null : (showSelector ? null : assignedLocationId),
  );

  useEffect(() => {
    if (isSuperAdmin && locations?.length && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    } else if (!showSelector && assignedLocationId) {
      setSelectedLocationId(assignedLocationId);
    } else if (showSelector && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    }
  }, [isSuperAdmin, showSelector, assignedLocationId, locations, selectedLocationId]);

  const currentLocation = locations?.find((l) => l.id === selectedLocationId);

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin"]}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("stats.title")}
          </h1>

          {showSelector && locations?.length ? (
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

        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-muted/50 border border-border/50 dark:border dark:border-white/50 rounded-xl">
            <TabsTrigger
              value="orders"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("stats.tabOrders")}
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("stats.tabProducts")}
            </TabsTrigger>
            <TabsTrigger
              value="modifiers"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("stats.tabModifiers")}
            </TabsTrigger>
            <TabsTrigger
              value="table"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("stats.tabTableReport")}
            </TabsTrigger>
            <TabsTrigger
              value="chart"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("stats.tabChartReport")}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="orders">
              <OrdersStatisticsPage />
            </TabsContent>
            <TabsContent value="products">
              <StatsProductsTab />
            </TabsContent>
            <TabsContent value="modifiers">
              <StatsModifiersTab />
            </TabsContent>
            <TabsContent value="table">
              <ProductMonthlyTableReport />
            </TabsContent>
            <TabsContent value="chart">
              <ChartReportPage locationId={selectedLocationId} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
