import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { MapPin } from "lucide-react";
import { ORDER_STATUS } from "@/lib/order-status";
import { useOrders } from "@/lib/order-store";
import type { SharedOrder } from "@/lib/order-store";

const COLS = 3;
const ITEM_HEIGHT = 140;
const ITEM_WIDTH = 160;
const GAP = 16;
const PADDING = 20;

function useVisibleCapacity(
  containerRef: React.RefObject<HTMLDivElement | null>,
  preparingCount: number,
  readyCount: number
) {
  const [capacity, setCapacity] = useState(9);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const totalW = el.clientWidth;
      const h = el.clientHeight;
      const colW = totalW / 2;
      const c = Math.min(COLS, Math.max(1, Math.floor((colW - PADDING * 2 + GAP) / (ITEM_WIDTH + GAP))));
      const r = Math.max(1, Math.floor((h - PADDING * 2 + GAP) / (ITEM_HEIGHT + GAP)));
      const cap = c * r;
      // #region agent log
      if (cap < 1 || cap > 99) fetch('http://127.0.0.1:7453/ingest/8a2f933e-05c0-4573-9457-60f66e1ab17f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a5c492'},body:JSON.stringify({sessionId:'a5c492',location:'OrderNumberDisplayView.tsx:useVisibleCapacity',message:'Capacity edge',data:{totalW,h,colW,c,r,cap},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setCapacity(cap);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, preparingCount, readyCount]);

  return capacity;
}

function isCactusFoodTruck(locationName: string | undefined): boolean {
  if (!locationName) return false;
  const lower = locationName.toLowerCase();
  return lower.includes("cactus") && lower.includes("food truck");
}

function getDisplayNumber(order: SharedOrder): string {
  if (order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16) {
    return String(order.pagerNumber);
  }
  return String(order.receiptOrderNumber ?? order.id);
}

function SplitColumn({
  title,
  orders,
  getDisplayNumber,
  capacity,
  hasDivider,
}: {
  title: string;
  orders: SharedOrder[];
  getDisplayNumber: (o: SharedOrder) => string;
  capacity: number;
  hasDivider?: boolean;
}) {
  const visible = orders.slice(0, capacity);
  return (
    <div className={`flex-1 flex flex-col min-w-0 border-r last:border-r-0 border-border/50 dark:border-white/50 ${hasDivider ? "order-number-divider" : ""}`}>
      <div className="order-number-section-header shrink-0 py-3 px-4 text-center border-b border-border/50 dark:border-white/50">
        <h2 className="text-lg md:text-xl font-display font-bold text-foreground">{title}</h2>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-4 p-5 overflow-hidden content-start min-h-0">
        {visible.map((order) => (
          <div
            key={order.id}
            className="order-number-pulse flex items-center justify-center rounded-2xl border border-border/50 dark:border-white/50 bg-muted/30 shadow-md px-6 py-5 min-h-[8rem]"
          >
            <span className="font-display font-bold text-foreground tabular-nums text-5xl sm:text-6xl md:text-7xl">
              {getDisplayNumber(order)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CactusSplitView({
  preparingOrders,
  readyForPickupOrders,
  getDisplayNumber,
  t,
}: {
  preparingOrders: SharedOrder[];
  readyForPickupOrders: SharedOrder[];
  getDisplayNumber: (o: SharedOrder) => string;
  t: (key: string) => string;
}) {
  const mainRef = useRef<HTMLDivElement>(null);
  const capacity = useVisibleCapacity(mainRef, preparingOrders.length, readyForPickupOrders.length);
  return (
    <div className="order-number-display-view pulse-sync h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <main ref={mainRef} className="flex-1 flex overflow-hidden min-h-0">
        <SplitColumn
          title={t("orderNumbers.gatavojas")}
          orders={preparingOrders}
          getDisplayNumber={getDisplayNumber}
          capacity={capacity}
          hasDivider
        />
        <SplitColumn
          title={t("orderNumbers.gatavsSanemsanai")}
          orders={readyForPickupOrders}
          getDisplayNumber={getDisplayNumber}
          capacity={capacity}
        />
      </main>
    </div>
  );
}

export default function OrderNumberDisplayView() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data: locations } = useLocations();

  const params = new URLSearchParams(window.location.search);
  const paramLocationId = Number(params.get("locationId")) || null;
  const locationId = paramLocationId ?? user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;
  const locationName = locations?.find((l) => l.id === locationId)?.name;

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  useEffect(() => {
    const handler = () => {
      // #region agent log
      fetch('http://127.0.0.1:7453/ingest/8a2f933e-05c0-4573-9457-60f66e1ab17f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a5c492'},body:JSON.stringify({sessionId:'a5c492',location:'OrderNumberDisplayView.tsx:order-ready-for-display',message:'Refresh triggered',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setRefreshTrigger((k) => k + 1);
    };
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

  const readyOrders = [...izsauktsOrders, ...gatavsOrders].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );
  const preparingOrders = [...gatavojasOrders, ...gatavsStillPreparing].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );
  const readyForPickupOrders = [...izsauktsOrders, ...gatavsReadyForPickup].sort(
    (a, b) => Number(b.id) - Number(a.id),
  );

  const isCactus = isCactusFoodTruck(locationName);
  const cactusHasOrders = preparingOrders.length > 0 || readyForPickupOrders.length > 0;

  // #region agent log
  useEffect(() => {
    const viewType = !locationId ? "noLocation" : isCactus && cactusHasOrders ? "CactusSplitView" : isCactus && !cactusHasOrders ? "waitingImage" : readyOrders.length === 0 ? "waitingImage" : "SingleGridView";
    fetch('http://127.0.0.1:7453/ingest/8a2f933e-05c0-4573-9457-60f66e1ab17f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a5c492'},body:JSON.stringify({sessionId:'a5c492',location:'OrderNumberDisplayView.tsx:render',message:'View state',data:{locationId,locationName,isCactus,preparingCount:preparingOrders.length,readyForPickupCount:readyForPickupOrders.length,readyCount:readyOrders.length,viewType,refreshTrigger},timestamp:Date.now()})}).catch(()=>{});
  }, [locationId, locationName, isCactus, cactusHasOrders, preparingOrders.length, readyForPickupOrders.length, readyOrders.length, refreshTrigger]);
  // #endregion

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

  if (isCactus && !cactusHasOrders) {
    const waitingImageUrl = (locations?.find((l) => l.id === locationId)?.config as { waitingImageUrl?: string } | undefined)?.waitingImageUrl ?? null;
    if (waitingImageUrl) {
      return (
        <div className="fixed inset-0 w-full h-full min-h-screen min-w-full bg-black flex items-center justify-center overflow-hidden">
          <img
            src={waitingImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700"
          />
        </div>
      );
    }
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen min-w-full bg-black" />
    );
  }

  if (isCactus && cactusHasOrders) {
    return (
      <CactusSplitView
        preparingOrders={preparingOrders}
        readyForPickupOrders={readyForPickupOrders}
        getDisplayNumber={getDisplayNumber}
        t={t}
      />
    );
  }

  if (readyOrders.length === 0) {
    const waitingImageUrl = (locations?.find((l) => l.id === locationId)?.config as { waitingImageUrl?: string } | undefined)?.waitingImageUrl ?? null;
    if (waitingImageUrl) {
      return (
        <div className="fixed inset-0 w-full h-full min-h-screen min-w-full bg-black flex items-center justify-center overflow-hidden">
          <img
            src={waitingImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700"
          />
        </div>
      );
    }
    return (
      <div className="fixed inset-0 w-full h-full min-h-screen min-w-full bg-black" />
    );
  }

  return (
    <SingleGridView
      readyOrders={readyOrders}
      getDisplayNumber={getDisplayNumber}
    />
  );
}

const SINGLE_COLS = 3;
const SINGLE_ITEM_HEIGHT = 160;
const SINGLE_ITEM_WIDTH = 200;
const SINGLE_GAP = 24;
const SINGLE_PADDING = 32;

function useSingleGridCapacity(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [capacity, setCapacity] = useState(16);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const cols = Math.min(SINGLE_COLS, Math.max(1, Math.floor((w - SINGLE_PADDING * 2 + SINGLE_GAP) / (SINGLE_ITEM_WIDTH + SINGLE_GAP))));
      const rows = Math.max(1, Math.floor((h - SINGLE_PADDING * 2 + SINGLE_GAP) / (SINGLE_ITEM_HEIGHT + SINGLE_GAP)));
      const cap = cols * rows;
      // #region agent log
      if (cap < 1 || cap > 99) fetch('http://127.0.0.1:7453/ingest/8a2f933e-05c0-4573-9457-60f66e1ab17f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a5c492'},body:JSON.stringify({sessionId:'a5c492',location:'OrderNumberDisplayView.tsx:useSingleGridCapacity',message:'Capacity edge',data:{w,h,cols,rows,cap},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setCapacity(cap);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return capacity;
}

function SingleGridView({
  readyOrders,
  getDisplayNumber,
}: {
  readyOrders: SharedOrder[];
  getDisplayNumber: (o: SharedOrder) => string;
}) {
  const mainRef = useRef<HTMLDivElement>(null);
  const capacity = useSingleGridCapacity(mainRef);
  const visible = readyOrders.slice(0, capacity);

  return (
    <div className="order-number-display-view pulse-sync h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <main ref={mainRef} className="flex-1 flex items-center justify-center p-8 overflow-hidden min-h-0">
        <div className="grid grid-cols-3 gap-6 w-full max-w-5xl mx-auto overflow-hidden">
          {visible.map((order) => (
            <div
              key={order.id}
              className="order-number-pulse flex items-center justify-center rounded-2xl border border-primary/30 dark:border dark:border-white/50 bg-primary/5 p-6 shadow-lg min-h-[9rem]"
            >
              <span className="text-5xl sm:text-6xl md:text-7xl font-display font-bold text-primary tabular-nums">
                {getDisplayNumber(order)}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
