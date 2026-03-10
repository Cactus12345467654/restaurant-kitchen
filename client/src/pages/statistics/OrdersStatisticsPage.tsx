import { useMemo, useState } from "react";
import { useTranslation } from "@/i18n";
import { useAllOrders, getOrderTimestamp } from "@/lib/order-store";
import {
  OrdersStatisticsFilters,
  useOrdersFiltersState,
  defaultFilters,
  type OrdersFiltersState as FiltersState,
} from "./OrdersStatisticsFilters";
import {
  OrdersStatisticsTable,
  mapOrderToStatisticsRow,
} from "./OrdersStatisticsTable";

function filterOrders(
  orders: ReturnType<typeof useAllOrders>,
  filters: FiltersState
) {
  return orders.filter((o) => {
    if (filters.orderNumber && !o.id.includes(filters.orderNumber)) return false;
    if (filters.status && o.status !== filters.status) return false;
    if (filters.searchText.trim()) {
      const q = filters.searchText.toLowerCase().trim();
      const matchId = o.id.toLowerCase().includes(q);
      const matchItems = (o.items ?? []).some((i) =>
        i.toLowerCase().includes(q)
      );
      if (!matchId && !matchItems) return false;
    }
    const ts = getOrderTimestamp(o);
    if (filters.datetimeFrom) {
      const from = new Date(filters.datetimeFrom).getTime();
      if (ts < from) return false;
    }
    if (filters.datetimeTo) {
      const to = new Date(filters.datetimeTo).getTime();
      if (ts > to) return false;
    }
    return true;
  });
}

const PAGE_SIZES = [25, 50, 100] as const;

export function OrdersStatisticsPage({ locationId }: { locationId?: number | null }) {
  const { t } = useTranslation();
  const { filters, setFilters, clearFilters } = useOrdersFiltersState();
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(() => filters);
  const fetchLocationId =
    appliedFilters.locationId && Number(appliedFilters.locationId)
      ? Number(appliedFilters.locationId)
      : locationId ?? undefined;
  const orders = useAllOrders(fetchLocationId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filteredAndSortedOrders = useMemo(() => {
    const filtered = filterOrders(orders, appliedFilters);
    return [...filtered].sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
  }, [orders, appliedFilters]);

  const rows = useMemo(() => {
    return filteredAndSortedOrders.map((o) => mapOrderToStatisticsRow(o, undefined));
  }, [filteredAndSortedOrders]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const handleSearch = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const handleClear = () => {
    const cleared = clearFilters();
    setAppliedFilters(cleared);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {t("statsOrders.title")}
        </h2>
      </div>

      <OrdersStatisticsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <p className="text-sm text-muted-foreground">
        {t("statsOrders.totalRecords")}: <strong>{rows.length}</strong>
        {rows.length === 0 && (
          <span className="ml-2 text-muted-foreground">
            ({t("statsOrders.noDataHint")})
          </span>
        )}
      </p>

      <OrdersStatisticsTable
        rows={paginatedRows}
        pagination={{
          page: currentPage,
          totalPages,
          pageSize,
          totalRows: rows.length,
          onPageChange: setPage,
          onPageSizeChange: (v) => {
            setPageSize(v);
            setPage(1);
          },
          pageSizeOptions: PAGE_SIZES,
        }}
      />
    </div>
  );
}
