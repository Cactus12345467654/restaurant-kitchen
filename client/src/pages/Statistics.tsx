import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useTranslation } from "@/i18n";
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



export default function Statistics() {
  const { t } = useTranslation();

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin"]}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("stats.title")}
          </h1>
        </div>

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
              <ProductMonthlyTableReport />
            </TabsContent>
            <TabsContent value="chart">
              <ChartReportPage />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
