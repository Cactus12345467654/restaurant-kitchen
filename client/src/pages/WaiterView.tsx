import { useMemo, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMenuItems, useMenuItemModifiers } from "@/hooks/use-menu";
import { useActiveTimeSessions } from "@/hooks/use-active-time-sessions";
import { Loader2, UtensilsCrossed, ArrowLeft, Check, X, ClipboardList, Send, Plus, Trash2, CheckCircle2, HandPlatter, Hash, UserCheck, Radio, Clock, MapPin } from "lucide-react";
import { resolveImageUrl } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation, LanguageSwitcher } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { ORDER_STATUS } from "@/lib/order-status";
import {
  addOrder,
  updateOrderStatus,
  updateOrderPagerCalled,
  useOrders,
  notifyNumberDisplay,
  getUsedPagerNumbers,
  type SharedOrder,
} from "@/lib/order-store";

interface OrderLineModifier {
  groupName: string;
  optionName: string;
  priceDelta: number;
}

interface OrderLine {
  uid: string;
  itemName: string;
  basePrice: number;
  modifiers: OrderLineModifier[];
  totalPrice: number;
}

let lineCounter = 0;

function ModifierModal({
  item,
  onClose,
  onAdd,
}: {
  item: { id: number; name: string; price: number };
  onClose: () => void;
  onAdd: (line: OrderLine) => void;
}) {
  const { data: rawGroups, isLoading } = useMenuItemModifiers(item.id);
  const [selections, setSelections] = useState<Record<number, { optionId: number; optionName: string; priceDelta: number }>>(
    {},
  );
  const { t } = useTranslation();

  const groups = useMemo(() => {
    if (!rawGroups) return [];
    return [...rawGroups]
      .filter((g: any) => g.isActive !== false)
      .sort((a: any, b: any) => {
        const aReq = (a.isRequired ?? a.is_required) === true ? 0 : 1;
        const bReq = (b.isRequired ?? b.is_required) === true ? 0 : 1;
        if (aReq !== bReq) return aReq - bReq;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [rawGroups]);

  const handleSelect = (group: any, option: any) => {
    setSelections((prev) => {
      const current = prev[group.id];
      if (current?.optionId === option.id) {
        const isRequired = (group.isRequired ?? group.is_required) === true;
        if (isRequired) return prev;
        const { [group.id]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [group.id]: {
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta ?? 0,
        },
      };
    });
  };

  const totalDelta = Object.values(selections).reduce((s, o) => s + o.priceDelta, 0);
  const requiredGroups = groups.filter((g: any) => (g.isRequired ?? g.is_required) === true);
  const allRequiredSelected = requiredGroups.every((g: any) => selections[g.id]);
  const canAdd = requiredGroups.length === 0 || allRequiredSelected;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex">
      <div className="bg-background text-foreground border-r border-border/50 w-[45%] min-w-[320px] max-w-2xl flex flex-col h-full">
        {/* header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border/50 shrink-0">
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display font-bold truncate">{item.name}</h2>
            <span className="text-sm text-primary font-semibold">
              €{(item.price / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Check className="h-8 w-8 text-primary" />
              <p className="text-muted-foreground text-sm">{t("waiter.noModifiers")}</p>
            </div>
          ) : (
            groups.map((group: any) => {
              const options = (group.options ?? [])
                .filter((o: any) => o.isActive !== false)
                .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
              const chosen = selections[group.id];
              return (
                <section key={group.id}>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    {group.name}
                    {(group.isRequired ?? group.is_required) === true ? (
                      <span className="text-[10px] font-medium text-primary normal-case tracking-normal">{`* ${t("common.required")}`}</span>
                    ) : (
                      <span className="text-[10px] font-normal text-muted-foreground normal-case tracking-normal">{t("common.notRequired")}</span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {options.map((opt: any) => {
                      const isSelected = chosen?.optionId === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelect(group, opt)}
                          className={`rounded-lg border p-3 text-left transition-colors flex flex-col gap-0.5 ${
                            isSelected
                              ? "border-primary bg-primary/15"
                              : "border-border/50 bg-white/5 hover:bg-white/10"
                          }`}
                        >
                          <span className="font-medium text-sm text-foreground">{opt.name}</span>
                          {opt.priceDelta !== 0 && (
                            <span className="text-xs text-primary">
                              {opt.priceDelta > 0 ? "+" : ""}€{(opt.priceDelta / 100).toFixed(2)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>

        {/* footer with add button */}
        <div className="border-t border-border/50 px-6 py-4 shrink-0 space-y-3">
          {Object.keys(selections).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groups.map((g: any) => {
                const chosen = selections[g.id];
                if (!chosen) return null;
                return (
                  <span
                    key={g.id}
                    className="inline-flex items-center gap-1 text-xs bg-white/10 rounded-full px-2.5 py-1 text-foreground"
                  >
                    <span className="text-muted-foreground">{g.name}:</span> {chosen.optionName}
                    {chosen.priceDelta !== 0 && (
                      <span className="text-primary ml-0.5">
                        {chosen.priceDelta > 0 ? "+" : ""}€{(chosen.priceDelta / 100).toFixed(2)}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {`${t("common.total")}:`}{" "}
              <span className="text-foreground font-semibold">
                €{((item.price + totalDelta) / 100).toFixed(2)}
              </span>
            </span>
          </div>
          <button
            disabled={!canAdd}
            onClick={() => {
              const modifiers: OrderLineModifier[] = groups
                .filter((g: any) => selections[g.id])
                .map((g: any) => {
                  const s = selections[g.id];
                  return { groupName: g.name, optionName: s.optionName, priceDelta: s.priceDelta };
                });
              onAdd({
                uid: `ol-${++lineCounter}`,
                itemName: item.name,
                basePrice: item.price,
                modifiers,
                totalPrice: item.price + totalDelta,
              });
            }}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-sm transition-colors ${
              canAdd
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed"
            }`}
          >
            <Plus className="h-4 w-4" />
            {t("waiter.addToOrder")} — €{((item.price + totalDelta) / 100).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGER_MODE_STORAGE_KEY = "waiter-pager-mode";

function usePagerMode(): [boolean, (on: boolean) => void] {
  const [pagerMode, setPagerModeState] = useState(() => {
    try {
      const v = localStorage.getItem(PAGER_MODE_STORAGE_KEY);
      return v === "1" || v === "true";
    } catch {
      return false;
    }
  });
  const setPagerMode = (on: boolean) => {
    setPagerModeState(on);
    try {
      localStorage.setItem(PAGER_MODE_STORAGE_KEY, on ? "1" : "0");
    } catch {}
  };
  return [pagerMode, setPagerMode];
}

type SidebarTab = "order" | "ready";

const PAGER_NUMBERS = Array.from({ length: 16 }, (_, i) => i + 1);

export default function WaiterView() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { t } = useTranslation();
  const params = new URLSearchParams(window.location.search);
  const paramLocationId = Number(params.get("locationId")) || null;
  const userLocationId = user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;
  const locationId = paramLocationId ?? userLocationId ?? null;
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    id: number;
    name: string;
    price: number;
  } | null>(null);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("order");
  const [pagerMode, setPagerMode] = usePagerMode();
  const [selectedPager, setSelectedPager] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const handleImgError = useCallback((id: number) => {
    setBrokenImages((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);
  const [timeTrackingOpen, setTimeTrackingOpen] = useState(false);
  const [timeTrackingCode, setTimeTrackingCode] = useState("");
  const [timeTrackingLoading, setTimeTrackingLoading] = useState(false);

  const { data: activeSessions = [], refetch: refetchActiveSessions } = useActiveTimeSessions(locationId);

  useEffect(() => {
    if (timeTrackingOpen && locationId) refetchActiveSessions();
  }, [timeTrackingOpen, locationId]);

  const gatavojasOrders = useOrders(locationId, ORDER_STATUS.GATAVOJAS);
  const gatavsOrders = useOrders(locationId, ORDER_STATUS.GATAVS);
  const waiterPreparingOrders = [...gatavojasOrders, ...gatavsOrders].sort(
    (a, b) => Number(a.id) - Number(b.id),
  );
  const orderTotal = orderLines.reduce((s, l) => s + l.totalPrice, 0);

  const usedPagers = useMemo(
    () => new Set(getUsedPagerNumbers([...gatavojasOrders, ...gatavsOrders])),
    [gatavojasOrders, gatavsOrders],
  );

  const markAsGatavs = (order: SharedOrder) => {
    const pagerNum = order.pagerNumber ?? null;
    notifyNumberDisplay(order.id, pagerNum);
    updateOrderStatus(order.id, ORDER_STATUS.GATAVS);
    if (pagerNum != null) updateOrderPagerCalled(order.id, true);
  };

  const markAsAtdotsKlientam = (orderId: string, currentStatus: string) => {
    if (currentStatus !== ORDER_STATUS.GATAVS) return;
    updateOrderStatus(orderId, ORDER_STATUS.ATDOTS_KLIENTAM);
  };

  const sendToKitchen = async () => {
    if (orderLines.length === 0 || !locationId) return;
    const items = orderLines.map((l) => {
      const modStr = l.modifiers.map((m) => m.optionName).join(", ");
      return modStr ? `${l.itemName} (${modStr})` : l.itemName;
    });
    const pagerNum = pagerMode ? selectedPager : null;
    try {
      await addOrder(locationId, items, pagerNum, orderTotal);
      setOrderLines([]);
      setShowConfirm(false);
      setSelectedPager(null);
    } catch (err) {
      console.error("Failed to send order:", err);
    }
  };

  const handleAddToOrder = (line: OrderLine) => {
    setOrderLines((prev) => [...prev, line]);
    setSelectedItem(null);
  };

  const handleProductClick = async (item: { id: number; name: string; price: number }) => {
    try {
      const res = await fetch(`/api/menu-items/${item.id}/modifiers`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const groups: any[] = await res.json();
      const hasActiveModifiers = (groups ?? []).some(
        (g: any) => g.isActive !== false && (g.options ?? []).some((o: any) => o.isActive !== false),
      );
      if (!hasActiveModifiers) {
        setOrderLines((prev) => [
          ...prev,
          {
            uid: `ol-${++lineCounter}`,
            itemName: item.name,
            basePrice: item.price,
            modifiers: [],
            totalPrice: item.price,
          },
        ]);
        return;
      }
    } catch {
      // Fallback: open modal
    }
    setSelectedItem(item);
  };

  const handleRemoveLine = (uid: string) => {
    setOrderLines((prev) => prev.filter((l) => l.uid !== uid));
  };

  const { data: menuItems, isLoading, isError, refetch } = useMenuItems(locationId);
  const { data: locations } = useLocations();
  const currentLocation = locations?.find((l) => l.id === locationId);

  const activeByCategory = useMemo(() => {
    const items = (menuItems ?? []).filter(
      (i: any) => (i.isAvailable ?? i.is_available) !== false,
    );
    const map = new Map<string, any[]>();
    items.forEach((item: any) => {
      const cat = item.category?.trim() || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    const entries = Array.from(map.entries());
    let catOrder: string[] = [];
    if (locationId) {
      try { catOrder = JSON.parse(localStorage.getItem(`cat-order-${locationId}`) || "[]"); } catch { /* ignore */ }
    }
    if (catOrder.length > 0) {
      const orderMap = new Map(catOrder.map((c, i) => [c, i]));
      entries.sort(([a], [b]) => {
        const ia = orderMap.get(a) ?? 9999;
        const ib = orderMap.get(b) ?? 9999;
        return ia !== ib ? ia - ib : a.localeCompare(b);
      });
    } else {
      entries.sort(([a], [b]) => a.localeCompare(b));
    }
    return entries;
  }, [menuItems, locationId]);

  if (!locationId) {
    if (isAuthLoading && !paramLocationId) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground text-lg">{t("waiter.noLocation")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg text-center">{t("waiter.loadError")}</p>
        <button
          onClick={() => refetch()}
          className="rounded-lg border border-primary bg-primary/15 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/25 transition-colors"
        >
          {t("waiter.retry")}
        </button>
      </div>
    );
  }

  if (activeByCategory.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <UtensilsCrossed className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-lg">{t("waiter.noItems")}</p>
      </div>
    );
  }

  const categoryItems = selectedCategory
    ? activeByCategory.find(([cat]) => cat === selectedCategory)?.[1] ?? []
    : [];

  return (
    <div className="h-screen bg-background text-foreground flex">
      {/* left: menu content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="border-b border-border/50 px-6 py-4 flex items-center gap-4 shrink-0">
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">{t("waiter.categories")}</span>
            </button>
          )}
          <h1 className="text-2xl font-display font-bold">
            {selectedCategory ?? t("waiter.title")}
          </h1>
          {currentLocation && (
            <Badge
              variant="secondary"
              className="text-sm px-3 py-1.5 gap-1.5 rounded-lg shrink-0"
            >
              <MapPin className="w-3.5 h-3.5" />
              {currentLocation.name}
            </Badge>
          )}
          <div className="ml-auto shrink-0 flex items-center gap-3">
            <button
              onClick={() => setTimeTrackingOpen(true)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSessions.length > 0 ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "border-border/50 bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="h-4 w-4" />
              {t("waiter.checkIn")}
              {activeSessions.length > 0 && (
                <span className="text-xs font-semibold">
                  ({activeSessions.map((s) => getInitials(s.username)).join(", ")})
                </span>
              )}
            </button>
            <button
              onClick={() => setPagerMode(!pagerMode)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                pagerMode
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/50 bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="h-4 w-4" />
              {t("waiter.pagers")}: {pagerMode ? t("waiter.pagersOn") : t("waiter.pagersOff")}
            </button>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 [touch-action:manipulation]">
          {!selectedCategory ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {activeByCategory.map(([category, items]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 transition-colors p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] text-center"
                >
                  <UtensilsCrossed className="h-8 w-8 text-primary" />
                  <span className="font-semibold text-lg text-foreground">{category}</span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? t("waiter.item") : t("waiter.items")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {categoryItems.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => handleProductClick({ id: item.id, name: item.name, price: item.price })}
                  className="rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 transition-colors overflow-hidden flex flex-col text-left [touch-action:manipulation]"
                >
                  {resolveImageUrl(item) && !brokenImages.has(item.id) ? (
                    <img
                      src={resolveImageUrl(item)!}
                      alt={item.name}
                      className="w-full h-32 object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={() => handleImgError(item.id)}
                    />
                  ) : (
                    <div className="w-full h-32 bg-white/10 flex items-center justify-center">
                      <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <span className="font-medium text-sm text-foreground leading-tight">{item.name}</span>
                    <span className="text-primary font-semibold text-sm mt-auto">
                      €{(item.price / 100).toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* right: order panel */}
      <aside className="w-[320px] shrink-0 border-l border-border/50 flex flex-col bg-white/[0.02]">
        {/* Sidebar tabs */}
        <div className="flex border-b border-border/50 shrink-0">
          <button
            onClick={() => setSidebarTab("order")}
            className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              sidebarTab === "order"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            {t("waiter.order")}
            {orderLines.length > 0 && (
              <span className="text-[10px] bg-primary/20 text-primary rounded-full px-1.5 py-0.5">
                {orderLines.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setSidebarTab("ready")}
            className={`flex-1 px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              sidebarTab === "ready"
                ? "text-emerald-400 border-b-2 border-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HandPlatter className="h-4 w-4" />
            {t("waiter.gatavojas")}
            {waiterPreparingOrders.length > 0 && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-1.5 py-0.5">
                {waiterPreparingOrders.length}
              </span>
            )}
          </button>
        </div>

        {sidebarTab === "order" ? (
          <>
            {orderLines.length === 0 ? (
              <div className="flex-1 overflow-y-auto flex items-center justify-center">
                <p className="text-muted-foreground text-sm">{t("waiter.orderEmpty")}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                {orderLines.map((line) => (
                  <div key={line.uid} className="px-5 py-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground">{line.itemName}</span>
                        {line.modifiers.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {line.modifiers.map((m, i) => (
                              <span
                                key={i}
                                className="text-[11px] bg-white/10 rounded px-1.5 py-0.5 text-muted-foreground"
                              >
                                {m.optionName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold text-foreground">
                          €{(line.totalPrice / 100).toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleRemoveLine(line.uid)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-border/50 px-5 py-4 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("common.total")}</span>
                <span className="text-lg font-semibold text-foreground">
                  €{(orderTotal / 100).toFixed(2)}
                </span>
              </div>
              <button
                disabled={orderLines.length === 0}
                onClick={() => setShowConfirm(true)}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 font-semibold text-sm ${
                  orderLines.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-primary/40 text-primary-foreground/60 cursor-not-allowed"
                }`}
              >
                <Send className="h-4 w-4" />
                {t("waiter.sendToKitchen")}
              </button>
            </div>
          </>
        ) : (
          <>
            {waiterPreparingOrders.length === 0 ? (
              <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="h-10 w-10 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground text-sm">{t("waiter.noGatavsOrders")}</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {gatavsOrders.length > 0 && (
                  <div className="border-b border-border/30">
                    <div className="px-4 py-2 bg-emerald-500/5 shrink-0 flex items-center gap-2">
                      <span className="font-display font-bold text-xs text-emerald-400">
                        {t("kitchen.gatavs")}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-1.5 py-0.5">
                        {gatavsOrders.length}
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {gatavsOrders.map((order) => {
                        const pagerCalled = order.pagerCalled === true;
                        const hasPager = order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16;
                        const showGatavs = hasPager && !pagerCalled;
                        return (
                          <div key={order.id} className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-muted-foreground truncate">#{order.id}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {hasPager && (
                                  <span className="text-xl font-semibold bg-primary/20 text-primary rounded-full px-2.5 py-0.5 min-w-[2rem] text-center">
                                    {order.pagerNumber}
                                  </span>
                                )}
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 rounded-full px-2 py-0.5 font-medium">
                                  {pagerCalled ? t("waiter.izsaukts") : t("kitchen.gatavs")}
                                </span>
                              </div>
                            </div>
                            <ul className="space-y-1">
                              {order.items.map((item, i) => (
                                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-2">
                              <button
                                disabled={!showGatavs}
                                onClick={() => showGatavs && markAsGatavs(order)}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold ${
                                  showGatavs
                                    ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                    : "bg-muted/20 text-muted-foreground cursor-not-allowed"
                                }`}
                              >
                                <Hash className="h-4 w-4" />
                                {pagerCalled ? t("waiter.izsaukts") : t("waiter.gatavs")}
                              </button>
                              <button
                                onClick={() => markAsAtdotsKlientam(order.id, order.status)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              >
                                <UserCheck className="h-4 w-4" />
                                {t("waiter.atdotsKlientam")}
                              </button>
                            </div>
                            {(order.totalPriceCents ?? (order as any).total_price_cents) != null && (
                              <p className="text-right text-sm font-semibold text-primary mt-2">
                                €{(((order.totalPriceCents ?? (order as any).total_price_cents) ?? 0) / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {gatavojasOrders.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-orange-500/5 shrink-0 flex items-center gap-2">
                      <span className="font-display font-bold text-xs text-orange-400">
                        {t("waiter.gatavojas")}
                      </span>
                      <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-1.5 py-0.5">
                        {gatavojasOrders.length}
                      </span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {gatavojasOrders.map((order) => {
                        const hasPager = order.pagerNumber != null && order.pagerNumber >= 1 && order.pagerNumber <= 16;
                        return (
                          <div key={order.id} className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-muted-foreground truncate">#{order.id}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {hasPager && (
                                  <span className="text-xl font-semibold bg-primary/20 text-primary rounded-full px-2.5 py-0.5 min-w-[2rem] text-center">
                                    {order.pagerNumber}
                                  </span>
                                )}
                                <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-2 py-0.5 font-medium">
                                  {order.status === ORDER_STATUS.GATAVS ? t("kitchen.gatavs") : t("waiter.gatavojas")}
                                </span>
                              </div>
                            </div>
                            <ul className="space-y-1">
                              {order.items.map((item, i) => (
                                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                            <div className="flex gap-2">
                              <button
                                onClick={() => markAsGatavs(order)}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                <Hash className="h-4 w-4" />
                                {t("waiter.gatavs")}
                              </button>
                              <button
                                disabled
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold bg-muted/20 text-muted-foreground cursor-not-allowed"
                              >
                                <UserCheck className="h-4 w-4" />
                                {t("waiter.atdotsKlientam")}
                              </button>
                            </div>
                            {(order.totalPriceCents ?? (order as any).total_price_cents) != null && (
                              <p className="text-right text-sm font-semibold text-primary mt-2">
                                €{(((order.totalPriceCents ?? (order as any).total_price_cents) ?? 0) / 100).toFixed(2)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </aside>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-background border border-border/50 rounded-xl p-6 w-full max-w-[440px] space-y-4">
            <h3 className="text-lg font-display font-bold text-foreground">
              {t("waiter.confirmSend")}
            </h3>
            {pagerMode && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">{t("waiter.selectPager")}</span>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedPager(null)}
                    className={`w-16 h-16 rounded-lg text-xl font-semibold transition-colors flex items-center justify-center ${
                      selectedPager === null
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/50 bg-white/5 hover:bg-white/10 active:bg-white/15"
                    }`}
                  >
                    –
                  </button>
                  {PAGER_NUMBERS.map((n) => {
                    const used = usedPagers.has(n);
                    return (
                      <button
                        key={n}
                        onClick={() => !used && setSelectedPager(n)}
                        disabled={used}
                        className={`w-16 h-16 rounded-lg text-xl font-semibold transition-colors flex items-center justify-center ${
                          selectedPager === n
                            ? "bg-primary text-primary-foreground"
                            : used
                              ? "bg-muted/30 text-muted-foreground cursor-not-allowed"
                              : "border border-border/50 bg-white/5 hover:bg-white/10 active:bg-white/15"
                        }`}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowConfirm(false); setSelectedPager(null); }}
                className="flex-1 rounded-lg border border-border/50 py-2.5 text-sm font-medium text-foreground hover:bg-white/5 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={sendToKitchen}
                className="flex-1 rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                {t("waiter.send")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <ModifierModal item={selectedItem} onClose={() => setSelectedItem(null)} onAdd={handleAddToOrder} />
      )}

      {timeTrackingOpen && locationId && (
        <TimeTrackingModal
          locationId={locationId}
          activeSessions={activeSessions}
          code={timeTrackingCode}
          setCode={setTimeTrackingCode}
          loading={timeTrackingLoading}
          setLoading={setTimeTrackingLoading}
          onClose={() => setTimeTrackingOpen(false)}
          onSessionChange={refetchActiveSessions}
          t={t}
        />
      )}

    </div>
  );
}

function formatDisplayName(username: string): string {
  const part = username.split("@")[0] || username;
  return part.replace(/\./g, " ").split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function getInitials(username: string): string {
  const part = (username.split("@")[0] || username).replace(/\./g, " ");
  const letters = part.split(/\s+/).map((w) => w.charAt(0).toUpperCase()).filter(Boolean);
  return letters.length > 0 ? letters.join("") : "?";
}

interface ActiveSessionRow {
  id: number;
  userId: number;
  username: string;
  pausedAt: string | null;
  startedAt?: string;
  totalPauseMinutes?: number;
}

function formatElapsed(startedAt: string, pausedAt: string | null, totalPauseMinutes: number): string {
  const start = new Date(startedAt).getTime();
  const end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
  const pauseMs = (totalPauseMinutes || 0) * 60 * 1000;
  const elapsedMs = Math.max(0, end - start - pauseMs);
  const totalMins = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

function SessionTimer({ startedAt, pausedAt, totalPauseMinutes }: { startedAt: string; pausedAt: string | null; totalPauseMinutes: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (pausedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [pausedAt]);
  const display = pausedAt ? formatElapsed(startedAt, pausedAt, totalPauseMinutes) : formatElapsed(startedAt, null, totalPauseMinutes || 0);
  return <span className="font-mono text-sm tabular-nums text-muted-foreground">{display}</span>;
}

function TimeTrackingModal({
  locationId,
  activeSessions,
  code,
  setCode,
  loading,
  setLoading,
  onClose,
  onSessionChange,
  t,
}: {
  locationId: number;
  activeSessions: ActiveSessionRow[];
  code: string;
  setCode: (s: string) => void;
  loading: boolean;
  setLoading: (b: boolean) => void;
  onClose: () => void;
  onSessionChange?: () => void;
  t: (k: string) => string;
}) {
  const { toast } = useToast();
  const [verifiedUserId, setVerifiedUserId] = useState<number | null>(null);

  useEffect(() => {
    if (code.length !== 4) {
      setVerifiedUserId(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/time-tracking/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, pin: code }),
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setVerifiedUserId(data?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setVerifiedUserId(null);
      });
    return () => { cancelled = true; };
  }, [code, locationId]);

  const doStart = async () => {
    if (code.length !== 4) return;
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, pin: code }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Kļūda");
      setCode("");
      onSessionChange?.();
      toast({ title: t("timeTrackingModal.authorizedSuccess"), description: formatDisplayName(data.username) });
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message || t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const doPauseForUser = async (row: ActiveSessionRow) => {
    if (verifiedUserId !== row.userId || code.length !== 4) {
      toast({ title: t("common.error"), description: "Ievadiet darbinieka kodu", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, pin: code, userId: row.userId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Kļūda");
      setCode("");
      onSessionChange?.();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message || t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const doResumeForUser = async (row: ActiveSessionRow) => {
    if (verifiedUserId !== row.userId || code.length !== 4) {
      toast({ title: t("common.error"), description: "Ievadiet darbinieka kodu", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, pin: code, userId: row.userId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Kļūda");
      setCode("");
      onSessionChange?.();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message || t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const doEndForUser = async (row: ActiveSessionRow) => {
    if (verifiedUserId !== row.userId || code.length !== 4) {
      toast({ title: t("common.error"), description: "Ievadiet darbinieka kodu", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/time-tracking/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, pin: code, userId: row.userId }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Kļūda");
      setCode("");
      onSessionChange?.();
    } catch (e: any) {
      toast({ title: t("common.error"), description: e.message || t("common.error"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="rounded-2xl w-full max-w-xl p-6 shadow-xl bg-card border border-border/50 max-h-[90vh] flex flex-col min-w-[380px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-display font-bold">{t("timeTrackingModal.title")}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{t("timeTrackingModal.startedTracking")}</p>
            {activeSessions.length > 0 ? (
              activeSessions.map((row) => {
                const isPaused = !!row.pausedAt;
                const canAct = verifiedUserId === row.userId && code.length === 4;
                const name = formatDisplayName(row.username);
                return (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 rounded-lg border border-border/50 bg-white/5 px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="font-medium truncate">{name}</span>
                      {row.startedAt && (
                        <SessionTimer
                          startedAt={row.startedAt}
                          pausedAt={row.pausedAt}
                          totalPauseMinutes={row.totalPauseMinutes ?? 0}
                        />
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isPaused ? (
                        <button
                          onClick={() => doResumeForUser(row)}
                          disabled={loading || !canAct}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                        >
                          {t("timeTrackingModal.resume")}
                        </button>
                      ) : (
                        <button
                          onClick={() => doPauseForUser(row)}
                          disabled={loading || !canAct}
                          className="px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-sm font-medium hover:bg-amber-500/25 disabled:opacity-50"
                        >
                          {t("timeTrackingModal.pause")}
                        </button>
                      )}
                      <button
                        onClick={() => doEndForUser(row)}
                        disabled={loading || !canAct}
                        className="px-3 py-1.5 rounded-lg border border-border/50 bg-white/5 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
                      >
                        {t("timeTrackingModal.end")}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground py-3">{t("timeTrackingModal.noOneStarted")}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t("timeTrackingModal.codePlaceholder")}
                className="flex-1 px-3 py-2 rounded-lg border border-border/50 bg-black/20"
              />
              <button
                onClick={doStart}
                disabled={loading || code.length !== 4}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("timeTrackingModal.start")}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-border/50 bg-white/5 text-sm font-medium hover:bg-white/10"
          >
            {t("timeTrackingModal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
