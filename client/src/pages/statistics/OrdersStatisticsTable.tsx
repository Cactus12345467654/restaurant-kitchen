import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslation } from "@/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS } from "@/lib/order-status";
import type { SharedOrder } from "@/lib/order-store";

export interface OrderStatisticsRow {
  id: string;
  orderNumber: string;
  acceptedAt: string;
  completedAt: string;
  cookingTime: string;
  cook: string;
  cookId: string;
  itemsContent: string;
  modifiersContent: string;
  price: string;
  costPrice: string;
  balanceTotal: string;
  location: string;
  status: string;
  pagerNumber: string;
}

const FALLBACK = "-";

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    gatavojas: "Gatavojas",
    gatavs: "Gatavs",
    izsaukts: "Izsaukts",
    atdots_klientam: "Atdots klientam",
  };
  return map[status] ?? status;
}

/** Order total: use totalPriceCents (cart total when sent to kitchen). Legacy: totalPrice if in cents. */
function getOrderTotalCents(order: SharedOrder): number | null {
  const c = order.totalPriceCents;
  if (c != null && typeof c === "number") return c;
  const legacy = (order as Record<string, unknown>).totalPrice;
  if (typeof legacy === "number" && legacy >= 0) return legacy;
  return null;
}

/** Completed timestamp: completedAt (set when status → GATAVS/ATDOTS_KLIENTAM). Legacy aliases. */
function getCompletedAt(order: SharedOrder): string | null {
  const v = order.completedAt;
  if (v && typeof v === "string") return v;
  const o = order as Record<string, unknown>;
  const legacy = o.completed_at ?? o.completedTime;
  if (typeof legacy === "string") return legacy;
  return null;
}

/** Map SharedOrder to statistics row. Uses order snapshot data; fallback for missing fields. */
export function mapOrderToStatisticsRow(
  order: SharedOrder,
  _locationName?: string
): OrderStatisticsRow {
  const items = order.items ?? [];
  const itemsContent = items.length > 0 ? items.join("; ") : FALLBACK;

  const modifiersContent = items
    .map((item) => {
      const match = item.match(/\(([^)]+)\)/);
      return match ? match[1] : null;
    })
    .filter(Boolean)
    .join("; ");
  const mods = modifiersContent || FALLBACK;

  const ts = order.createdAt
    ? new Date(order.createdAt).getTime()
    : Number(order.id);
  const acceptedDate = !isNaN(ts) && ts > 0 ? new Date(ts) : new Date();
  const acceptedAt =
    order.createdAt
      ? format(new Date(order.createdAt), "yyyy-MM-dd HH:mm")
      : !isNaN(ts) && ts > 0
        ? format(acceptedDate, "yyyy-MM-dd HH:mm")
        : `${new Date().toISOString().slice(0, 10)} ${order.time}`;

  const completedAtRaw = getCompletedAt(order);
  const completedAt = completedAtRaw
    ? format(new Date(completedAtRaw), "yyyy-MM-dd HH:mm")
    : FALLBACK;

  const cookingTime =
    completedAtRaw && (order.createdAt || (!isNaN(ts) && ts > 0))
      ? `${Math.round((new Date(completedAtRaw).getTime() - acceptedDate.getTime()) / 60000)} min`
      : FALLBACK;

  const totalCents = getOrderTotalCents(order);
  const price =
    totalCents != null ? `€${(totalCents / 100).toFixed(2)}` : FALLBACK;

  return {
    id: order.id,
    orderNumber: order.id,
    acceptedAt,
    completedAt,
    cookingTime,
    cook: FALLBACK,
    cookId: FALLBACK,
    itemsContent,
    modifiersContent: mods,
    price,
    costPrice: FALLBACK,
    balanceTotal: FALLBACK,
    location: _locationName ?? FALLBACK,
    status: formatStatus(order.status),
    pagerNumber: order.pagerNumber != null ? String(order.pagerNumber) : FALLBACK,
  };
}

interface PaginationProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalRows: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions: readonly number[];
}

interface OrdersStatisticsTableProps {
  rows: OrderStatisticsRow[];
  pagination?: PaginationProps;
}

export function OrdersStatisticsTable({ rows, pagination }: OrdersStatisticsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="max-h-[calc(100vh-380px)] overflow-auto rounded-xl border border-border/50 bg-card/30">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-muted/90 backdrop-blur">
            <TableRow className="border-border/50 hover:bg-transparent h-8">
            <TableHead className="sticky left-0 z-10 bg-muted/50 font-semibold text-xs px-2 py-1.5 h-8">
              {t("statsOrders.colOrderNo")}
            </TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colPager")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8 whitespace-nowrap">{t("statsOrders.colPrice")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colAccepted")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colCompleted")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colCookingTime")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colCook")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colWaiter")}</TableHead>
            <TableHead className="min-w-[180px] font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colItems")}</TableHead>
            <TableHead className="min-w-[120px] font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colModifiers")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colCostPrice")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colBalance")}</TableHead>
            <TableHead className="font-semibold text-xs px-2 py-1.5 h-8">{t("statsOrders.colLocation")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={13}
                className="py-12 text-center text-muted-foreground"
              >
                {t("statsOrders.noOrders")}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-border/30 hover:bg-muted/20 h-9"
              >
                <TableCell className="sticky left-0 z-10 bg-card/80 font-medium text-xs px-2 py-1.5">
                  {row.orderNumber}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.pagerNumber}</TableCell>
                <TableCell className="text-xs px-2 py-1.5 font-medium whitespace-nowrap">{row.price}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.acceptedAt}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.completedAt}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.cookingTime}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.cook}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.cookId}</TableCell>
                <TableCell className="max-w-[200px] truncate text-xs px-2 py-1.5">
                  {row.itemsContent}
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-xs px-2 py-1.5 text-muted-foreground">
                  {row.modifiersContent}
                </TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.costPrice}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.balanceTotal}</TableCell>
                <TableCell className="text-xs px-2 py-1.5">{row.location}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    {pagination && (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {t("statsOrders.rowsPerPage")}
          </span>
          <select
            value={pagination.pageSize}
            onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {pagination.pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.totalRows)}{" "}
            {t("statsOrders.of")} {pagination.totalRows}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pagination.page <= 1}
            onClick={() => pagination.onPageChange(pagination.page - 1)}
          >
            {t("statsOrders.prevPage")}
          </Button>
          <span className="px-2 text-xs text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.page + 1)}
          >
            {t("statsOrders.nextPage")}
          </Button>
        </div>
      </div>
    )}
    </div>
  );
}
