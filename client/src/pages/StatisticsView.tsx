import { useLocationWithUrlSync } from "@/hooks/use-location-with-url-sync";
import { useTranslation } from "@/i18n";
import { BarChart3, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrdersStatisticsPage } from "./statistics/OrdersStatisticsPage";
import { ChartReportPage } from "./statistics/ChartReportPage";
import { ProductMonthlyTableReport } from "./statistics/ProductMonthlyTableReport";
import { ModifierMonthlyTableReport } from "./statistics/ModifierMonthlyTableReport";

export default function StatisticsView() {
  const { t } = useTranslation();
  const { locationId, setLocationId, locations, showLocationSelector } = useLocationWithUrlSync();
  const locationName = locations?.find((l) => l.id === locationId)?.name;

  if (!locationId) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">{t("stats.noLocation")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="border-b border-border/50 dark:border-b dark:border-white/50 dark:border-white/50 px-4 py-2.5 flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t("stats.title")}
          </h1>
          {showLocationSelector && locations && locations.length > 0 ? (
            <Select
              value={locationId?.toString() ?? ""}
              onValueChange={(v) => setLocationId(v ? Number(v) : null)}
            >
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
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
          ) : locationName ? (
            <Badge
              variant="secondary"
              className="text-xs px-2.5 py-0.5 gap-1 rounded-md font-normal"
            >
              <MapPin className="w-3 h-3" />
              {locationName}
            </Badge>
          ) : null}
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-muted/50 border border-border/50 dark:border dark:border-white/50 dark:border-white/50 rounded-xl">
              <TabsTrigger
                value="chart"
                className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {t("stats.tabChartReport")}
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {t("stats.tabOrders")}
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
            </TabsList>

            <div className="mt-6">
              <TabsContent value="chart">
                <ChartReportPage locationId={locationId} />
              </TabsContent>
              <TabsContent value="orders">
                <OrdersStatisticsPage locationId={locationId} />
              </TabsContent>
              <TabsContent value="modifiers">
                <ModifierMonthlyTableReport initialLocationId={locationId} />
              </TabsContent>
              <TabsContent value="table">
                <ProductMonthlyTableReport initialLocationId={locationId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
