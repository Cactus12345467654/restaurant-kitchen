import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { BarChart3, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { OrdersStatisticsPage } from "./statistics/OrdersStatisticsPage";
import { ChartReportPage } from "./statistics/ChartReportPage";
import { ProductMonthlyTableReport } from "./statistics/ProductMonthlyTableReport";

function StatsProductsTab() {
  const { t } = useTranslation();
  return (
    <Card className="p-8 bg-card border-border/50 rounded-2xl">
      <h2 className="text-xl font-display font-semibold text-foreground">
        {t("stats.tabProducts")}
      </h2>
    </Card>
  );
}

function StatsModifiersTab() {
  const { t } = useTranslation();
  return (
    <Card className="p-8 bg-card border-border/50 rounded-2xl">
      <h2 className="text-xl font-display font-semibold text-foreground">
        {t("stats.tabModifiers")}
      </h2>
    </Card>
  );
}



export default function StatisticsView() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();

  const params = new URLSearchParams(window.location.search);
  const paramLocationId = Number(params.get("locationId")) || null;
  const locationId = paramLocationId ?? user?.locationId ?? null;
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
      <header className="border-b border-border/50 px-4 py-2.5 flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-primary" />
            {t("stats.title")}
          </h1>
          {locationName && (
            <Badge
              variant="secondary"
              className="text-xs px-2.5 py-0.5 gap-1 rounded-md font-normal"
            >
              <MapPin className="w-3 h-3" />
              {locationName}
            </Badge>
          )}
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto w-full">
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-muted/50 border border-border/50 rounded-xl">
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
                <ProductMonthlyTableReport initialLocationId={locationId} />
              </TabsContent>
              <TabsContent value="chart">
                <ChartReportPage />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
