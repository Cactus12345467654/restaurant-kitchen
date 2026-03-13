import { useCallback, useEffect, useState } from "react";
import { ORDER_STATUS, normalizeStatus, type OrderStatus } from "./order-status";

const ALL_STATUSES = Object.values(ORDER_STATUS) as OrderStatus[];

const POLL_MS_VISIBLE = 1000;
const POLL_MS_HIDDEN = 10000;

export interface SharedOrder {
  id: string;
  time: string;
  status: OrderStatus;
  items: string[];
  /** Pager 1–16 when assigned; null when none. */
  pagerNumber?: number | null;
  /** True after waiter pressed "Gatavs" and pager signal sent. */
  pagerCalled?: boolean;
  /** Cart total in cents when sent to kitchen. */
  totalPriceCents?: number | null;
  /** True when order is for takeaway (līdzi), false for dine-in (uz vietas). */
  isTakeaway?: boolean;
  /** Čeka numurs (parādās UI un čekā). */
  receiptOrderNumber?: number | null;
  /** ISO timestamp when order was created (for statistics). */
  createdAt?: string | null;
  /** ISO timestamp when order was marked ready (GATAVS) or delivered (ATDOTS_KLIENTAM). */
  completedAt?: string | null;
}

function mapApiOrder(o: Record<string, unknown>): SharedOrder {
  return {
    id: String(o.id),
    time: typeof o.time === "string" ? o.time : "00:00",
    status: normalizeStatus(String(o.status ?? "gatavojas")),
    items: Array.isArray(o.items) ? o.items : [],
    pagerNumber: typeof o.pagerNumber === "number" ? o.pagerNumber : null,
    pagerCalled: o.pagerCalled === true,
    totalPriceCents: typeof o.totalPriceCents === "number" ? o.totalPriceCents : (typeof (o as any).total_price_cents === "number" ? (o as any).total_price_cents : null),
    isTakeaway: o.isTakeaway === true || (o as any).is_takeaway === true,
    receiptOrderNumber: typeof o.receiptOrderNumber === "number" ? o.receiptOrderNumber : (typeof (o as any).receipt_order_number === "number" ? (o as any).receipt_order_number : null),
    createdAt: typeof o.createdAt === "string" ? o.createdAt : null,
    completedAt: typeof o.completedAt === "string" ? o.completedAt : null,
  };
}

export async function addOrder(
  locationId: number,
  items: string[],
  pagerNumber?: number | null,
  totalPriceCents?: number | null,
  isTakeaway?: boolean,
  receiptOrderNumber?: number | null
): Promise<SharedOrder> {
  const res = await fetch(`/api/locations/${locationId}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, pagerNumber: pagerNumber ?? null, totalPriceCents: totalPriceCents ?? null, isTakeaway: isTakeaway ?? false, receiptOrderNumber: receiptOrderNumber ?? null }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to create order");
  }
  const data = await res.json();
  return mapApiOrder(data);
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update order");
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

export async function updateOrderPagerCalled(orderId: string, pagerCalled: boolean): Promise<void> {
  const res = await fetch(`/api/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pagerCalled }),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Failed to update order");
  }
}

/** Pager numbers 1–16 currently assigned to active (non-archived) orders. */
export function getUsedPagerNumbers(ordersList: SharedOrder[]): number[] {
  const active = ordersList.filter(
    (o) =>
      o.status !== ORDER_STATUS.ATDOTS_KLIENTAM &&
      o.pagerNumber != null &&
      o.pagerNumber >= 1 &&
      o.pagerNumber <= 16,
  );
  return Array.from(new Set(active.map((o) => o.pagerNumber!)));
}

export function getOrdersByStatus(ordersList: SharedOrder[], ...statuses: OrderStatus[]): SharedOrder[] {
  return ordersList.filter((o) => statuses.includes(o.status));
}

/** Order creation timestamp in ms (for statistics). Uses createdAt when available, else falls back to legacy id. */
export function getOrderTimestamp(order: SharedOrder): number {
  if (order.createdAt && typeof order.createdAt === "string") {
    const ts = new Date(order.createdAt).getTime();
    if (!isNaN(ts)) return ts;
  }
  const n = Number(order.id);
  return isNaN(n) ? 0 : n;
}

/** All orders (for statistics view). */
export function getAllOrders(ordersList: SharedOrder[]): SharedOrder[] {
  return ordersList;
}

async function fetchOrdersByLocation(locationId: number, statuses: string[]): Promise<SharedOrder[]> {
  const statusParam = statuses.join(",");
  const res = await fetch(`/api/locations/${locationId}/orders?status=${encodeURIComponent(statusParam)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  const data = await res.json();
  return Array.isArray(data) ? data.map(mapApiOrder) : [];
}

async function fetchAllOrders(locationId?: number | null): Promise<SharedOrder[]> {
  const url = locationId != null ? `/api/orders?locationId=${locationId}` : "/api/orders";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch orders");
  const data = await res.json();
  return Array.isArray(data) ? data.map(mapApiOrder) : [];
}

/**
 * React hook that returns live orders for a location, filtered by statuses.
 * Polls the API so kitchen and waiter stay in sync across devices.
 * Optional last arg: refreshTrigger (number) – when it changes, triggers immediate refetch.
 */
export function useOrders(
  locationId: number | null,
  ...args: (OrderStatus | number)[]
): SharedOrder[] {
  const last = args[args.length - 1];
  const refreshTrigger = typeof last === "number" ? last : undefined;
  const statuses = (refreshTrigger !== undefined ? args.slice(0, -1) : args) as OrderStatus[];

  const filter = useCallback(
    (list: SharedOrder[]) => list.filter((o) => statuses.includes(o.status)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statuses.join(",")],
  );

  const [orders, setOrders] = useState<SharedOrder[]>([]);

  useEffect(() => {
    if (!locationId) {
      setOrders([]);
      return;
    }

    const load = async () => {
      try {
        const list = await fetchOrdersByLocation(locationId, statuses);
        setOrders(filter(list));
      } catch {
        setOrders([]);
      }
    };

    load();

    const getPollMs = () =>
      document.visibilityState === "visible" ? POLL_MS_VISIBLE : POLL_MS_HIDDEN;
    let intervalId = setInterval(load, getPollMs());
    const onVisibilityChange = () => {
      load();
      clearInterval(intervalId);
      intervalId = setInterval(load, getPollMs());
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [locationId, statuses.join(","), filter, refreshTrigger ?? 0]);

  return orders;
}

/**
 * Live hook for all orders (statistics). Polls the API.
 * Returns { orders, error } - error is set when fetch fails (e.g. 401).
 */
export function useAllOrders(locationId?: number | null): SharedOrder[] {
  const [orders, setOrders] = useState<SharedOrder[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchAllOrders(locationId ?? undefined);
        setOrders(list);
      } catch {
        setOrders([]);
      }
    };

    load();

    const getPollMs = () =>
      document.visibilityState === "visible" ? POLL_MS_VISIBLE : POLL_MS_HIDDEN;
    let intervalId = setInterval(load, getPollMs());
    const onVisibilityChange = () => {
      load();
      clearInterval(intervalId);
      intervalId = setInterval(load, getPollMs());
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(intervalId);
    };
  }, [locationId ?? "all"]);

  return orders;
}
