import { useMemo, useState } from "react";
import { useTranslation } from "@/i18n";
import { useAllOrders } from "@/lib/order-store";
import { buildMonthlyProductMatrix } from "./table-report-utils";
import { ProductMonthlyTableFilters } from "./ProductMonthlyTableFilters";
import {
  defaultTableReportFilters,
  getDefaultTableReportFilters,
  type TableReportFiltersState,
} from "./ProductMonthlyTableFilters";
import { ProductMonthlyTableGrid } from "./ProductMonthlyTableGrid";

export function ProductMonthlyTableReport({
  initialLocationId,
}: {
  initialLocationId?: number | null;
}) {
  const { t } = useTranslation();
  const orders = useAllOrders();
  const defaultFilters = useMemo(
    () => getDefaultTableReportFilters(initialLocationId),
    [initialLocationId]
  );

  const [filters, setFilters] = useState<TableReportFiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<TableReportFiltersState>(
    defaultFilters
  );

  const matrix = useMemo(() => {
    return buildMonthlyProductMatrix(
      orders,
      appliedFilters.year,
      appliedFilters.month
    );
  }, [orders, appliedFilters.year, appliedFilters.month]);

  const handleSearch = () => {
    setAppliedFilters(filters);
  };

  const handleClear = () => {
    const def = {
      ...defaultTableReportFilters,
      locationId: initialLocationId != null ? String(initialLocationId) : "",
    };
    setFilters(def);
    setAppliedFilters(def);
    try {
      localStorage.setItem("table-report-filters", JSON.stringify(def));
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-display font-bold text-foreground">
        {t("stats.tabTableReport")}
      </h2>

      <ProductMonthlyTableFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <ProductMonthlyTableGrid
        matrix={matrix}
        year={appliedFilters.year}
        month={appliedFilters.month}
      />
    </div>
  );
}
