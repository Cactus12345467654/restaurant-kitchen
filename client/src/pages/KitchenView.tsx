import { useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { Flame, CheckCircle2, UtensilsCrossed, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS } from "@/lib/order-status";
import { useOrders, updateOrderStatus } from "@/lib/order-store";

export default function KitchenView() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();

  const kitchenOrders = useOrders(ORDER_STATUS.GATAVOJAS);

  const columnMapRef = useRef<Record<string, "left" | "right">>({});
  const sortedOrders = [...kitchenOrders].sort((a, b) => Number(a.id) - Number(b.id));
  const map = columnMapRef.current;
  const activeIds = new Set(sortedOrders.map((o) => o.id));
  for (const id of Object.keys(map)) {
    if (!activeIds.has(id)) delete map[id];
  }
  for (const order of sortedOrders) {
    if (order.id in map) continue;
    const leftCount = Object.values(map).filter((c) => c === "left").length;
    const rightCount = Object.values(map).filter((c) => c === "right").length;
    map[order.id] = leftCount <= rightCount ? "left" : "right";
  }
  const leftColumnOrders = sortedOrders.filter((o) => map[o.id] === "left");
  const rightColumnOrders = sortedOrders.filter((o) => map[o.id] === "right");

  const params = new URLSearchParams(window.location.search);
  const paramLocationId = Number(params.get("locationId")) || null;
  const locationId = paramLocationId ?? user?.locationId ?? null;
  const locationName = locations?.find((l) => l.id === locationId)?.name;

  if (!locationId) {
    return (
      <div className="h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">{t("kitchen.noLocation")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Compact header */}
      <header className="border-b border-border/50 px-4 py-2.5 flex items-center justify-between shrink-0 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2.5">
            <UtensilsCrossed className="w-5 h-5 text-orange-400" />
            {t("kitchen.title")}
          </h1>
          {locationName && (
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5 gap-1 rounded-md font-normal">
              <MapPin className="w-3 h-3" />
              {locationName}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-emerald-500 text-xs font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("kitchen.liveOrders")}
          </p>
          <ThemeToggle />
        </div>
      </header>

      {/* Single passive column: live queue (no cook action required) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 border-b border-border/30 bg-orange-500/5 shrink-0 flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="font-display font-bold text-sm text-orange-400">{t("kitchen.gatavojas")}</span>
          {kitchenOrders.length > 0 && (
            <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-1.5 py-0.5 font-semibold">
              {kitchenOrders.length}
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {kitchenOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <UtensilsCrossed className="w-8 h-8 mb-1.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">{t("kitchen.noOrders")}</p>
            </div>
          ) : (
            <div className="flex gap-2 min-h-0 flex-1">
              {[leftColumnOrders, rightColumnOrders].map((columnOrders, colIdx) => (
                <div
                  key={colIdx}
                  className="flex-1 flex flex-col gap-2 min-w-0 overflow-y-auto"
                >
                  {columnOrders.map((order) => {
                    const isKitchenConfirmed = order.status === ORDER_STATUS.GATAVS;
                    const handleMarkReady = () => {
                      updateOrderStatus(order.id, ORDER_STATUS.GATAVS);
                    };
                    return (
                      <div
                        key={order.id}
                        className="bg-card/80 border-l-[3px] border-l-orange-500 rounded-lg px-3 py-2 shadow-sm shadow-black/10 min-w-0 shrink-0"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-muted-foreground truncate">#{order.id}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16 && (
                              <span className="text-[10px] text-primary font-medium">P{order.pagerNumber}</span>
                            )}
                            <span className="text-orange-400 text-[11px] font-mono flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" />
                              {isKitchenConfirmed ? t("kitchen.gatavs") : t("kitchen.gatavojas")}
                            </span>
                          </span>
                        </div>
                        <ul className="space-y-2 mb-3">
                          {order.items.map((item, i) => {
                            const parenIdx = item.indexOf(" (");
                            const mainName = parenIdx >= 0 ? item.slice(0, parenIdx) : item;
                            const modifiers = parenIdx >= 0 ? item.slice(parenIdx + 2, -1) : null;
                            return (
                              <li key={i} className="text-foreground flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 mt-1.5" />
                                <span className="min-w-0">
                                  <span className="text-xl font-semibold leading-snug block">{mainName}</span>
                                  {modifiers && (
                                    <span className="text-base font-medium text-muted-foreground block mt-0.5">
                                      ({modifiers})
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                        <button
                          type="button"
                          className="w-full rounded-md py-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          onClick={handleMarkReady}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t("kitchen.markReady")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
