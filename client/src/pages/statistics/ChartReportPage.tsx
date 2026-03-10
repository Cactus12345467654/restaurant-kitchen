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
  Tooltip,
  Legend,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Card } from "@/components/ui/card";

const GATAVOJAS = ORDER_STATUS.GATAVOJAS;
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

function getCompletedAt(order: SharedOrder): string | null {
  const v = order.completedAt;
  if (v && typeof v === "string") return v;
  const o = order as Record<string, unknown>;
  const legacy = o.completed_at ?? o.completedTime;
  return typeof legacy === "string" ? legacy : null;
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

  const { dailyData, weeklyData, todayRevenue, weeklyRevenue } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000;

    const dailyByHour: Record<number, { hour: string; gatavojas: number; pabeigti: number }> = {};
    for (let h = 0; h < 24; h++) {
      dailyByHour[h] = {
        hour: `${h.toString().padStart(2, "0")}`,
        gatavojas: 0,
        pabeigti: 0,
      };
    }

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartTs = weekStart.getTime();

    const weeklyArr: { day: string; label: string; gatavojas: number; pabeigti: number; revenue: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dte = new Date(weekStart);
      dte.setDate(dte.getDate() + d);
      weeklyArr.push({
        day: dte.toISOString().slice(0, 10),
        label: WEEKDAY_LABELS[dte.getDay()] ?? "",
        gatavojas: 0,
        pabeigti: 0,
        revenue: 0,
      });
    }
    const dayToIndex = new Map(weeklyArr.map((e, i) => [e.day, i]));

    let todayRev = 0;
    let weekRev = 0;

    for (const order of orders) {
      const ts = getOrderTimestamp(order);
      const created = new Date(ts);
      const totalCents = getTotalCents(order);
      const completedAt = getCompletedAt(order);

      if (ts >= todayStart && ts < todayEnd) {
        const hour = created.getHours();
        if (order.status === GATAVOJAS) {
          dailyByHour[hour].gatavojas++;
        } else if (isCompleted(order.status)) {
          dailyByHour[hour].pabeigti++;
        }
      }

      if (completedAt && isCompleted(order.status)) {
        const completedDate = new Date(completedAt);
        const completedDayStart = new Date(
          completedDate.getFullYear(),
          completedDate.getMonth(),
          completedDate.getDate()
        ).getTime();
        if (completedDayStart >= todayStart && completedDayStart < todayEnd) {
          todayRev += totalCents;
        }
        if (completedDayStart >= weekStartTs) {
          weekRev += totalCents;
        }
      }

      if (ts >= weekStartTs) {
        const dayStr = created.toISOString().slice(0, 10);
        const idx = dayToIndex.get(dayStr);
        if (idx != null) {
          const entry = weeklyArr[idx];
          if (order.status === GATAVOJAS) {
            entry.gatavojas++;
          } else if (isCompleted(order.status)) {
            entry.pabeigti++;
            entry.revenue += totalCents;
          }
        }
      }
    }

    const dailyArr = Object.values(dailyByHour);

    return {
      dailyData: dailyArr,
      weeklyData: weeklyArr,
      todayRevenue: todayRev,
      weeklyRevenue: weekRev,
    };
  }, [orders]);

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-display font-bold text-foreground">
        {t("stats.tabChartReport")}
      </h2>

      {/* Daily chart */}
      <Card className="p-6 bg-card border-border/50 rounded-2xl">
        <p className="text-lg font-semibold text-foreground mb-1">
          {t("statsChart.todayRevenue")}: €{(todayRevenue / 100).toFixed(2)}
        </p>
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
                const p = payload[0]?.payload;
                const total = (p?.gatavojas ?? 0) + (p?.pabeigti ?? 0);
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
                    <p className="font-medium mb-1">{p?.hour ?? ""}:00</p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.orders")}: {total}
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
        <p className="text-lg font-semibold text-foreground mb-1">
          {t("statsChart.weeklyRevenue")}: €{(weeklyRevenue / 100).toFixed(2)}
        </p>
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
                const revenue = p?.revenue != null ? (p.revenue / 100).toFixed(2) : "0.00";
                const total = (p?.gatavojas ?? 0) + (p?.pabeigti ?? 0);
                return (
                  <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-lg">
                    <p className="font-medium mb-1">{p?.day ?? label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.orders")}: {total}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("statsChart.revenue")}: €{revenue}
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
