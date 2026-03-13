import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS } from "@/lib/order-status";
import { useOrders } from "@/lib/order-store";
import type { SharedOrder } from "@/lib/order-store";

function getDisplayNumber(order: SharedOrder): string {
  if (order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16) {
    return String(order.pagerNumber);
  }
  return String(order.receiptOrderNumber ?? order.id);
}

export default function OrderNumberDisplayView() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();

  const params = new URLSearchParams(window.location.search);
  const paramLocationId = Number(params.get("locationId")) || null;
  const locationId = paramLocationId ?? user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;
  const locationName = locations?.find((l) => l.id === locationId)?.name;

  const izsauktsOrders = useOrders(locationId, ORDER_STATUS.IZSAUKTS);
  const gatavsOrders = useOrders(locationId, ORDER_STATUS.GATAVS);
  const readyOrders = [...izsauktsOrders, ...gatavsOrders].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );

  if (!locationId) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">{t("orderNumbers.noLocation")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="border-b border-border/50 dark:border-b dark:border-white/50 px-4 py-2.5 flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-bold text-foreground">
            {t("orderNumbers.screenTitle")}
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

      <main className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 w-full max-w-6xl mx-auto">
          {readyOrders.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-2xl font-display font-semibold">
                {t("orderNumbers.noOrdersReady")}
              </p>
            </div>
          ) : (
            readyOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col items-center justify-center rounded-2xl border border-primary/30 dark:border dark:border-white/50 bg-primary/5 p-8 shadow-lg"
              >
                <span className="text-7xl md:text-8xl font-display font-bold text-primary tabular-nums">
                  {getDisplayNumber(order)}
                </span>
                <span className="mt-2 text-sm text-muted-foreground">
                  {order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16
                    ? t("orderNumbers.pager")
                    : t("orderNumbers.order")}
                </span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
