import { useMemo } from "react";
import { useTranslation } from "@/i18n";
import { useAllOrders } from "@/lib/order-store";
import { ORDER_STATUS } from "@/lib/order-status";
import { getOrderTimestamp, type SharedOrder } from "@/lib/order-store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";

const COMPLETED_STATUSES = [
  ORDER_STATUS.GATAVS,
  ORDER_STATUS.IZSAUKTS,
  ORDER_STATUS.ATDOTS_KLIENTAM,
] as const;

function isCompleted(status: string): boolean {
  return COMPLETED_STATUSES.includes(status as (typeof COMPLETED_STATUSES)[number]);
}

function getTotalCents(order: SharedOrder): number {
  const c = order.totalPriceCents;
  if (c != null && typeof c === "number") return c;
  const legacy = (order as Record<string, unknown>).totalPrice;
  return typeof legacy === "number" && legacy >= 0 ? legacy : 0;
}

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Sv",
  1: "P",
  2: "O",
  3: "T",
  4: "C",
  5: "Pk",
  6: "S",
};

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const chartConfig = {
  gatavojas: {
    label: "Gatavojas",
    color: "hsl(25 95% 53%)",
    theme: { light: "hsl(25 95% 53%)", dark: "hsl(25 95% 53%)" },
  },
  pabeigti: {
    label: "Pabeigti",
    color: "hsl(142 71% 45%)",
    theme: { light: "hsl(142 71% 45%)", dark: "hsl(142 71% 45%)" },
  },
};

export function ChartReportPage({ locationId }: { locationId?: number | null }) {
  const { t } = useTranslation();
  const orders = useAllOrders(locationId);

  const { dailyData, weeklyData, todayRevenue, weeklyRevenue, todayAvgBasket, weeklyAvgBasket } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const dailyByHour: Record<number, { hour: string; gatavojas: number; pabeigti: number; revenue: number; orderCount: number }> = {};
    for (let h = 0; h < 24; h++) {
      dailyByHour[h] = { hour: `${h.toString().padStart(2, "0")}`, gatavojas: 0, pabeigti: 0, revenue: 0, orderCount: 0 };
    }

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = weekStart.getTime();

    const weeklyArr: { day: string; label: string; gatavojas: number; pabeigti: number; revenue: number; orderCount: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dte = new Date(weekStart);
      dte.setDate(dte.getDate() + d);
      weeklyArr.push({
        day: toLocalDateStr(dte),
        label: WEEKDAY_LABELS[dte.getDay()] ?? "",
        gatavojas: 0,
        pabeigti: 0,
        revenue: 0,
        orderCount: 0,
      });
    }
    const dayToIndex = new Map(weeklyArr.map((e, i) => [e.day, i]));

    let todayRev = 0;
    let todayCount = 0;
    let weekRev = 0;
    let weekCount = 0;

    for (const order of orders) {
      const ts = getOrderTimestamp(order);
      const created = new Date(ts);
      const totalCents = getTotalCents(order);

      if (ts >= todayStart && ts < todayEnd) {
        const hour = created.getHours();
        dailyByHour[hour].orderCount++;
        dailyByHour[hour].revenue += totalCents;
        if (isCompleted(order.status)) {
          dailyByHour[hour].pabeigti++;
        } else {
          dailyByHour[hour].gatavojas++;
        }
        todayCount++;
        todayRev += totalCents;
      }

      if (ts >= weekStartTs) {
        const dayStr = toLocalDateStr(created);
        const idx = dayToIndex.get(dayStr);
        if (idx != null) {
          weeklyArr[idx].orderCount++;
          weeklyArr[idx].revenue += totalCents;
          if (isCompleted(order.status)) {
            weeklyArr[idx].pabeigti++;
          } else {
            weeklyArr[idx].gatavojas++;
          }
        }
        weekCount++;
        weekRev += totalCents;
      }
    }

    return {
      dailyData: Object.values(dailyByHour),
      weeklyData: weeklyArr,
      todayRevenue: todayRev,
      weeklyRevenue: weekRev,
      todayAvgBasket: todayCount > 0 ? todayRev / todayCount : 0,
      weeklyAvgBasket: weekCount > 0 ? weekRev / weekCount : 0,
    };
  }, [orders]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-display font-bold text-foreground">
        {t("stats.tabChartReport")}
      </h2>

      {/* Daily chart */}
      <Card className="p-6 bg-card border-border/50 rounded-2xl">
        <div className="flex flex-wrap items-baseline gap-x-6 mb-1">
          <p className="text-lg font-semibold text-foreground">
            {t("statsChart.todayRevenue")}: €{(todayRevenue / 100).toFixed(2)}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {t("statsChart.avgBasket")}: €{(todayAvgBasket / 100).toFixed(2)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("statsChart.dailyByHour")}
        </p>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={dailyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = (payload[0]?.payload ?? payload[1]?.payload) as { hour?: string; revenue?: number; orderCount?: number } | undefined;
                const cnt = p?.orderCount ?? 0;
                const rev = p?.revenue ?? 0;
                const avg = cnt > 0 ? (rev / 100 / cnt).toFixed(2) : "0.00";
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
                    <p className="font-medium mb-1">{p?.hour ?? ""}:00</p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.orders")}: {cnt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.traded")}: €{(rev / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.avgBasket")}: €{avg}
                    </p>
                  </div>
                );
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="gatavojas" stackId="a" fill="var(--color-gatavojas)" name="Gatavojas" />
            <Bar dataKey="pabeigti" stackId="a" fill="var(--color-pabeigti)" name="Pabeigti" />
          </BarChart>
        </ChartContainer>
      </Card>

      {/* Weekly chart */}
      <Card className="p-6 bg-card border-border/50 rounded-2xl">
        <div className="flex flex-wrap items-baseline gap-x-6 mb-1">
          <p className="text-lg font-semibold text-foreground">
            {t("statsChart.weeklyRevenue")}: €{(weeklyRevenue / 100).toFixed(2)}
          </p>
          <p className="text-sm font-medium text-muted-foreground">
            {t("statsChart.avgBasket")}: €{(weeklyAvgBasket / 100).toFixed(2)}
          </p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t("statsChart.weeklyByDay")}
        </p>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload;
                const cnt = p?.orderCount ?? 0;
                const rev = p?.revenue ?? 0;
                const avg = cnt > 0 ? (rev / 100 / cnt).toFixed(2) : "0.00";
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
                    <p className="font-medium mb-1">{p?.day ?? label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.orders")}: {cnt}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.revenue")}: €{(rev / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.avgBasket")}: €{avg}
                    </p>
                  </div>
                );
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="gatavojas" stackId="b" fill="var(--color-gatavojas)" name="Gatavojas" />
            <Bar dataKey="pabeigti" stackId="b" fill="var(--color-pabeigti)" name="Pabeigti" />
          </BarChart>
        </ChartContainer>
      </Card>
    </div>
  );
}
