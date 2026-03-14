import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { MapPin } from "lucide-react";
import { ORDER_STATUS } from "@/lib/order-status";
import { useOrders } from "@/lib/order-store";
import type { SharedOrder } from "@/lib/order-store";
import type { ScreenOrientation } from "@shared/schema";

const COLS = 3;
const ITEM_HEIGHT = 140;
const ITEM_WIDTH = 160;
const GAP = 16;
const PADDING = 20;

function useVisibleCapacity(
  containerRef: React.RefObject<HTMLDivElement | null>,
  preparingCount: number,
  readyCount: number,
  orientation: ScreenOrientation
) {
  const [capacity, setCapacity] = useState(9);
  const colsPerHalf = orientation === "vertical-left" || orientation === "vertical-right" ? 2 : COLS;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const totalW = el.clientWidth;
      const h = el.clientHeight;
      const colW = totalW / 2;
      const c = Math.min(colsPerHalf, Math.max(1, Math.floor((colW - PADDING * 2 + GAP) / (ITEM_WIDTH + GAP))));
      const r = Math.max(1, Math.floor((h - PADDING * 2 + GAP) / (ITEM_HEIGHT + GAP)));
      setCapacity(c * r);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, preparingCount, readyCount, colsPerHalf]);

  return capacity;
}

function getDisplayNumber(order: SharedOrder): string {
  if (order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16) {
    return String(order.pagerNumber);
  }
  return String(order.receiptOrderNumber ?? order.id);
}

/** No vienādi numuri vienlaicīgi – saglabā tikai unikālus, prioritāte gatavs saņemšanai */
function dedupeByDisplayNumber(
  orders: SharedOrder[],
  excludeNumbers?: Set<string>,
  getNum: (o: SharedOrder) => string = getDisplayNumber
): SharedOrder[] {
  const seen = new Set<string>(excludeNumbers);
  const result: SharedOrder[] = [];
  for (const o of orders) {
    const num = getNum(o);
    if (seen.has(num)) continue;
    seen.add(num);
    result.push(o);
  }
  return result;
}

// --- Orientation helpers ---

function useResolvedOrientation(configured: ScreenOrientation): ScreenOrientation {
  const [resolved, setResolved] = useState<ScreenOrientation>(() => {
    if (configured !== "auto") return configured;
    return "horizontal";
  });

  useEffect(() => {
    if (configured !== "auto") {
      setResolved(configured);
      return;
    }

    const detect = () => {
      try {
        const type = screen?.orientation?.type;
        if (type?.startsWith("portrait")) {
          setResolved("vertical-right");
          return;
        }
      } catch {}
      if (window.innerHeight > window.innerWidth) {
        setResolved("vertical-right");
      } else {
        setResolved("horizontal");
      }
    };

    detect();
    try { screen.orientation?.addEventListener("change", detect); } catch {}
    window.addEventListener("resize", detect);
    return () => {
      try { screen.orientation?.removeEventListener("change", detect); } catch {}
      window.removeEventListener("resize", detect);
    };
  }, [configured]);

  return resolved;
}

function useFullscreen() {
  const requested = useRef(false);
  const tryFullscreen = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => tryFullscreen();
    document.addEventListener("click", handler, { once: true });
    document.addEventListener("touchstart", handler, { once: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [tryFullscreen]);
}

/**
 * Outer wrapper: rotation only. Inner content: width/height 100%, no transform.
 * - horizontal: fixed inset 0, 100vw x 100vh, no transform
 * - vertical-left: fixed top 0 left 0, 100vh x 100vw, rotate(-90deg) translateX(-100%), origin top left
 * - vertical-right: fixed top 0 left 0, 100vh x 100vw, rotate(90deg) translateY(-100%), origin top left
 */
function getOrientationStyle(orientation: ScreenOrientation): React.CSSProperties {
  if (orientation === "horizontal" || orientation === "auto") {
    return {
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100vh",
      overflow: "hidden",
    };
  }
  if (orientation === "vertical-left") {
    return {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vh",
      height: "100vw",
      transform: "rotate(-90deg) translateX(-100%)",
      transformOrigin: "top left",
      overflow: "hidden",
    };
  }
  return {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vh",
    height: "100vw",
    transform: "rotate(90deg) translateY(-100%)",
    transformOrigin: "top left",
    overflow: "hidden",
  };
}

const INNER_CONTENT_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

function OrientationWrapper({
  orientation,
  children,
}: {
  orientation: ScreenOrientation;
  children: React.ReactNode;
}) {
  return (
    <div style={getOrientationStyle(orientation)}>
      <div style={INNER_CONTENT_STYLE}>{children}</div>
    </div>
  );
}

// --- Grid components ---

function SplitColumn({
  title,
  orders,
  getDisplayNumber,
  capacity,
  hasDivider,
  isVertical,
  singleNumberPerColumn,
  sectionType,
}: {
  title: string;
  orders: SharedOrder[];
  getDisplayNumber: (o: SharedOrder) => string;
  capacity: number;
  hasDivider?: boolean;
  isVertical?: boolean;
  singleNumberPerColumn?: boolean;
  sectionType?: "gatavojas" | "gatavs";
}) {
  const visible = orders.slice(0, capacity);
  const gridStyle =
    singleNumberPerColumn && isVertical && visible.length > 0
      ? { gridTemplateColumns: "1fr" }
      : undefined;
  const gridCols =
    !singleNumberPerColumn
      ? isVertical
        ? "grid-cols-2"
        : "grid-cols-3"
      : singleNumberPerColumn && !isVertical
        ? "grid-cols-3"
        : "";
  return (
    <div
      className={`flex-1 flex flex-col min-w-0 border-r last:border-r-0 border-border/50 dark:border-white/50 ${hasDivider ? "order-number-divider" : ""}`}
      data-section={sectionType}
    >
      <div className="order-number-section-header shrink-0 py-3 px-4 text-center border-b border-border/50 dark:border-white/50">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{title}</h2>
      </div>
      <div
        className={`flex-1 grid gap-4 p-5 min-h-0 ${singleNumberPerColumn ? "overflow-y-auto content-start" : "overflow-hidden content-start"} ${gridCols}`}
        style={gridStyle}
      >
        {visible.map((order) => (
          <div
            key={order.id}
            className="order-number-pulse flex items-center justify-center rounded-2xl border border-border/50 dark:border-white/50 bg-muted/30 shadow-md px-6 py-5 min-h-[8rem]"
          >
            <span
              className={`font-display font-bold text-foreground tabular-nums ${
                singleNumberPerColumn
                  ? "text-7xl sm:text-8xl md:text-9xl"
                  : isVertical
                    ? "text-7xl md:text-8xl"
                    : "text-5xl sm:text-6xl md:text-7xl"
              }`}
            >
              {getDisplayNumber(order)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SplitView({
  preparingOrders,
  readyForPickupOrders,
  getDisplayNumber,
  t,
  orientation,
  singleNumberPerColumn,
  isFoodTruck,
}: {
  preparingOrders: SharedOrder[];
  readyForPickupOrders: SharedOrder[];
  getDisplayNumber: (o: SharedOrder) => string;
  t: (key: string) => string;
  orientation: ScreenOrientation;
  singleNumberPerColumn?: boolean;
  isFoodTruck?: boolean;
}) {
  const mainRef = useRef<HTMLDivElement>(null);
  const capacity = useVisibleCapacity(mainRef, preparingOrders.length, readyForPickupOrders.length, orientation);
  const isVertical = orientation === "vertical-left" || orientation === "vertical-right";
  return (
    <div
      className={`order-number-display-view pulse-sync w-full h-full bg-background text-foreground flex flex-col overflow-hidden ${isFoodTruck ? "order-number-display-food-truck" : ""}`}
    >
      <main ref={mainRef} className="flex-1 flex overflow-hidden min-h-0">
        <SplitColumn
          title={t("orderNumbers.gatavojas")}
          orders={preparingOrders}
          getDisplayNumber={getDisplayNumber}
          capacity={capacity}
          hasDivider
          isVertical={isVertical}
          singleNumberPerColumn={singleNumberPerColumn}
          sectionType="gatavojas"
        />
        <SplitColumn
          title={t("orderNumbers.gatavsSanemsanai")}
          orders={readyForPickupOrders}
          getDisplayNumber={getDisplayNumber}
          capacity={capacity}
          isVertical={isVertical}
          singleNumberPerColumn={singleNumberPerColumn}
          sectionType="gatavs"
        />
      </main>
    </div>
  );
}

// --- Main component ---

export default function OrderNumberDisplayView() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();

  const params = new URLSearchParams(window.location.search);
  const paramLocationId = Number(params.get("locationId")) || null;
  const locationId = paramLocationId ?? user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;

  const urlOrientation = params.get("orientation") as ScreenOrientation | null;
  const locationConfig = locations?.find((l) => l.id === locationId)?.config as
    | { waitingImageUrl?: string; screenOrientation?: ScreenOrientation }
    | undefined;
  const configOrientation: ScreenOrientation = locationConfig?.screenOrientation ?? "auto";

  const configuredOrientation: ScreenOrientation =
    urlOrientation && ["auto", "horizontal", "vertical-left", "vertical-right"].includes(urlOrientation)
      ? urlOrientation
      : configOrientation;

  const orientation = useResolvedOrientation(configuredOrientation);

  if (import.meta.env.DEV) {
    console.debug("[OrderNumberDisplay] orientation:", {
      urlOrientation,
      configOrientation,
      configuredOrientation,
      applied: orientation,
    });
  }

  useFullscreen();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  useEffect(() => {
    const handler = () => setRefreshTrigger((k) => k + 1);
    window.addEventListener("order-ready-for-display", handler);
    return () => window.removeEventListener("order-ready-for-display", handler);
  }, []);

  const izsauktsOrders = useOrders(locationId, ORDER_STATUS.IZSAUKTS, refreshTrigger);
  const gatavsOrders = useOrders(locationId, ORDER_STATUS.GATAVS, refreshTrigger);
  const gatavojasOrders = useOrders(locationId, ORDER_STATUS.GATAVOJAS, refreshTrigger);

  const hasPager = (o: SharedOrder) =>
    o.pagerNumber != null && o.pagerNumber >= 1 && o.pagerNumber <= 16;
  const gatavsReadyForPickup = gatavsOrders.filter(
    (o) => !hasPager(o) || o.pagerCalled === true,
  );
  const gatavsStillPreparing = gatavsOrders.filter(
    (o) => hasPager(o) && o.pagerCalled !== true,
  );

  const readyForPickupRaw = [...izsauktsOrders, ...gatavsReadyForPickup].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );
  const readyForPickupOrders = dedupeByDisplayNumber(readyForPickupRaw);
  const readyNumbers = new Set(readyForPickupOrders.map(getDisplayNumber));

  const preparingRaw = [...gatavojasOrders, ...gatavsStillPreparing].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );
  const preparingOrders = dedupeByDisplayNumber(preparingRaw, readyNumbers);

  const splitHasOrders = preparingOrders.length > 0 || readyForPickupOrders.length > 0;

  const locationName = locations?.find((l) => l.id === locationId)?.name ?? "";
  const isCactusFoodTruck =
    locationName.toLowerCase().includes("cactus") && locationName.toLowerCase().includes("food truck");
  const isFoodTruck = locationName.toLowerCase().includes("food truck");

  if (!locationId) {
    return (
      <div className="order-number-display-view h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground text-lg">{t("orderNumbers.noLocation")}</p>
        </div>
      </div>
    );
  }

  if (!splitHasOrders) {
    const waitingImageUrl = locationConfig?.waitingImageUrl ?? null;
    if (waitingImageUrl) {
      return (
        <OrientationWrapper orientation={orientation}>
          <div className="w-full h-full bg-black flex items-center justify-center">
            <img
              src={waitingImageUrl}
              alt=""
              className="max-w-full max-h-full object-contain animate-in fade-in duration-700"
            />
          </div>
        </OrientationWrapper>
      );
    }
    return (
      <OrientationWrapper orientation={orientation}>
        <div className="w-full h-full bg-black" />
      </OrientationWrapper>
    );
  }

  return (
    <OrientationWrapper orientation={orientation}>
      <SplitView
        preparingOrders={preparingOrders}
        readyForPickupOrders={readyForPickupOrders}
        getDisplayNumber={getDisplayNumber}
        t={t}
        orientation={orientation}
        singleNumberPerColumn={isCactusFoodTruck}
        isFoodTruck={isFoodTruck}
      />
    </OrientationWrapper>
  );
}
