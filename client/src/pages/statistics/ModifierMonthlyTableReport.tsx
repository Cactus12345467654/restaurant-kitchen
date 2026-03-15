import { useMemo, useState } from "react";
import { useTranslation } from "@/i18n";
import { useAllOrders } from "@/lib/order-store";
import { buildMonthlyModifierMatrix } from "./table-report-utils";
import { ProductMonthlyTableFilters } from "./ProductMonthlyTableFilters";
import {
  defaultTableReportFilters,
  getDefaultTableReportFilters,
  type TableReportFiltersState,
} from "./ProductMonthlyTableFilters";
import { ModifierMonthlyTableGrid } from "./ModifierMonthlyTableGrid";

export function ModifierMonthlyTableReport({
  initialLocationId,
}: {
  initialLocationId?: number | null;
}) {
  const { t } = useTranslation();
  const orders = useAllOrders(initialLocationId ?? undefined);
  const defaultFilters = useMemo(
    () => getDefaultTableReportFilters(initialLocationId),
    [initialLocationId]
  );

  const [filters, setFilters] = useState<TableReportFiltersState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<TableReportFiltersState>(
    defaultFilters
  );

  const matrix = useMemo(() => {
    return buildMonthlyModifierMatrix(
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
        {t("stats.tabModifiers")}
      </h2>

      <ProductMonthlyTableFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      <ModifierMonthlyTableGrid
        matrix={matrix}
        year={appliedFilters.year}
        month={appliedFilters.month}
      />
    </div>
  );
}
