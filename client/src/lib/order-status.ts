/**
 * Order status lifecycle (cook action NOT required):
 * - gatavojas: sent to kitchen, in preparation, visible to waiter and kitchen
 * - gatavs: optional - cook may mark ready (helper only), same visibility as gatavojas
 * - izsaukts: waiter pressed "Gatavs" (pager signal sent), hidden from kitchen, visible to waiter
 * - atdots_klientam: handed to customer, archived
 */
export const ORDER_STATUS = {
  GATAVOJAS: "gatavojas",
  GATAVS: "gatavs",
  IZSAUKTS: "izsaukts",
  ATDOTS_KLIENTAM: "atdots_klientam",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Kitchen shows only orders in preparation; gatavs disappears from kitchen */
export const KITCHEN_STATUSES: OrderStatus[] = [ORDER_STATUS.GATAVOJAS];

export function isKitchenActive(status: OrderStatus): boolean {
  return KITCHEN_STATUSES.includes(status);
}

export function isIzsaukts(status: OrderStatus): boolean {
  return status === ORDER_STATUS.IZSAUKTS;
}

export function isArchived(status: OrderStatus): boolean {
  return status === ORDER_STATUS.ATDOTS_KLIENTAM;
}

/** Map legacy statuses to new model for backward compatibility */
const LEGACY_MAP: Record<string, OrderStatus> = {
  new: ORDER_STATUS.GATAVOJAS,
  preparing: ORDER_STATUS.GATAVOJAS,
  ready: ORDER_STATUS.GATAVS,
  izsaukts: ORDER_STATUS.IZSAUKTS,
  delivered: ORDER_STATUS.ATDOTS_KLIENTAM,
};

export function normalizeStatus(status: string): OrderStatus {
  const values = Object.values(ORDER_STATUS) as string[];
  if (values.includes(status)) return status as OrderStatus;
  return LEGACY_MAP[status] ?? ORDER_STATUS.GATAVOJAS;
}
