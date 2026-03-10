import { useCallback, useEffect, useState } from "react";
import { ORDER_STATUS, normalizeStatus, type OrderStatus } from "./order-status";

const ALL_STATUSES = Object.values(ORDER_STATUS) as OrderStatus[];

const STORAGE_KEY = "mock_orders";
const POLL_MS_VISIBLE = 2000;
const POLL_MS_HIDDEN = 10000;

export interface SharedOrder {
  id: string;
  time: string;
  status: OrderStatus;
  items: string[];
  /** Pager 1–16 when assigned; null when none. */
  pagerNumber?: number | null;
  /** True after waiter pressed "Gatavs" and pager signal was sent. */
  pagerCalled?: boolean;
  /** Cart total in cents when sent to kitchen. */
  totalPriceCents?: number | null;
  /** ISO timestamp when order was marked ready (GATAVS) or delivered (ATDOTS_KLIENTAM). */
  completedAt?: string | null;
}

let orderSeq = Date.now();

function nextId(): string {
  return String(++orderSeq);
}

function now(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function readOrders(): SharedOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const orders = raw ? JSON.parse(raw) : [];
    return orders.map((o: SharedOrder) => ({
      ...o,
      status: normalizeStatus(o.status),
    }));
  } catch {
    return [];
  }
}

const ORDERS_UPDATED_EVENT = "orders-updated";

function writeOrders(orders: SharedOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new CustomEvent(ORDERS_UPDATED_EVENT));
}

export function addOrder(
  items: string[],
  pagerNumber?: number | null,
  totalPriceCents?: number | null
): SharedOrder {
  const order: SharedOrder = {
    id: nextId(),
    time: now(),
    status: ORDER_STATUS.GATAVOJAS,
    items,
    pagerNumber: pagerNumber ?? null,
    pagerCalled: false,
    totalPriceCents: totalPriceCents ?? null,
    completedAt: null,
  };
  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);
  return order;
}

export function updateOrderStatus(orderId: string, newStatus: OrderStatus): void {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx !== -1) {
    const o = orders[idx];
    o.status = newStatus;
    if (
      !o.completedAt &&
      (newStatus === ORDER_STATUS.GATAVS || newStatus === ORDER_STATUS.ATDOTS_KLIENTAM)
    ) {
      o.completedAt = new Date().toISOString();
    }
    writeOrders(orders);
  }
}

/** Notify number display system when waiter marks order as ready for pickup. */
export function notifyNumberDisplay(orderId: string, pagerNumber?: number | null): void {
  window.dispatchEvent(
    new CustomEvent("order-ready-for-display", {
      detail: { orderId, pagerNumber: pagerNumber ?? undefined },
    }),
  );
}

/** Update pagerCalled flag on an order. */
export function updateOrderPagerCalled(orderId: string, pagerCalled: boolean): void {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx !== -1) {
    orders[idx].pagerCalled = pagerCalled;
    writeOrders(orders);
  }
}

/** Pager numbers 1–16 currently assigned to active (non-archived) orders. */
export function getUsedPagerNumbers(): number[] {
  const orders = readOrders();
  const active = orders.filter(
    (o) =>
      o.status !== ORDER_STATUS.ATDOTS_KLIENTAM &&
      o.pagerNumber != null &&
      o.pagerNumber >= 1 &&
      o.pagerNumber <= 16,
  );
  return [...new Set(active.map((o) => o.pagerNumber!))];
}

export function getOrdersByStatus(...statuses: OrderStatus[]): SharedOrder[] {
  return readOrders().filter((o) => statuses.includes(o.status));
}

/** All orders (for statistics view). */
export function getAllOrders(): SharedOrder[] {
  return readOrders();
}

/**
 * React hook that returns live orders filtered by the given statuses.
 * Syncs across browser tabs via the `storage` event and a short poll
 * for same-tab writes.
 */
export function useOrders(...statuses: OrderStatus[]): SharedOrder[] {
  const filter = useCallback(
    () => readOrders().filter((o) => statuses.includes(o.status)),
    // statuses are constants passed at call-site, stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses.join(",")],
  );

  const [orders, setOrders] = useState<SharedOrder[]>(filter);

  useEffect(() => {
    const refresh = () => setOrders(filter());

    // Cross-tab sync
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);

    // Same-tab sync (when this tab writes)
    const onOrdersUpdated = () => refresh();
    window.addEventListener(ORDERS_UPDATED_EVENT, onOrdersUpdated);

    // Visibility-aware: immediate refresh + reschedule poll when tab becomes visible
    const getPollMs = () =>
      document.visibilityState === "visible" ? POLL_MS_VISIBLE : POLL_MS_HIDDEN;
    let intervalId = setInterval(refresh, getPollMs());
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
      clearInterval(intervalId);
      intervalId = setInterval(refresh, getPollMs());
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ORDERS_UPDATED_EVENT, onOrdersUpdated);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [filter]);

  return orders;
}

/** Live hook for all orders (statistics). */
export function useAllOrders(): SharedOrder[] {
  return useOrders(...ALL_STATUSES);
}
