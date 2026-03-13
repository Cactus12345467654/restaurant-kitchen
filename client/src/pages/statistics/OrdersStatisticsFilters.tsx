import { useState } from "react";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { DateTimePicker } from "@/components/DateTimePicker";
import { ORDER_STATUS } from "@/lib/order-status";

const FILTER_STORAGE_KEY = "orders-stats-filters";

export interface OrdersFiltersState {
  datetimeFrom: string;
  datetimeTo: string;
  locationId: string;
  cookId: string;
  orderNumber: string;
  status: string;
  takeaway: string;
  searchText: string;
}

export const defaultFilters: OrdersFiltersState = {
  datetimeFrom: "",
  datetimeTo: "",
  locationId: "",
  cookId: "",
  orderNumber: "",
  status: "",
  takeaway: "",
  searchText: "",
};

function toISODateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function loadFilters(): OrdersFiltersState {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const migrated: Partial<OrdersFiltersState> = {};
      if (parsed.datetimeFrom != null) migrated.datetimeFrom = String(parsed.datetimeFrom);
      else if (parsed.dateFrom) migrated.datetimeFrom = `${parsed.dateFrom}T00:00`;
      if (parsed.datetimeTo != null) migrated.datetimeTo = String(parsed.datetimeTo);
      else if (parsed.dateTo) migrated.datetimeTo = `${parsed.dateTo}T23:59`;
      if (parsed.locationId != null) migrated.locationId = String(parsed.locationId);
      if (parsed.cookId != null) migrated.cookId = String(parsed.cookId);
      if (parsed.orderNumber != null) migrated.orderNumber = String(parsed.orderNumber);
      if (parsed.status != null) migrated.status = String(parsed.status);
      if (parsed.takeaway != null) migrated.takeaway = String(parsed.takeaway);
      if (parsed.searchText != null) migrated.searchText = String(parsed.searchText);
      return { ...defaultFilters, ...migrated };
    }
  } catch {}
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    ...defaultFilters,
    datetimeFrom: toISODateTime(todayStart),
    datetimeTo: toISODateTime(now),
  };
}

function saveFilters(f: OrdersFiltersState) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(f));
  } catch {}
}

interface OrdersStatisticsFiltersProps {
  filters: OrdersFiltersState;
  onFiltersChange: (f: OrdersFiltersState) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function OrdersStatisticsFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
}: OrdersStatisticsFiltersProps) {
  const { t } = useTranslation();
  const { data: locations } = useLocations();
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<OrdersFiltersState>) => {
    const next = { ...filters, ...patch };
    onFiltersChange(next);
    saveFilters(next);
  };

  return (
    <div className="rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30 p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{t("statsOrders.filtersSearch")}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.dateFrom")}
            </Label>
            <DateTimePicker
              value={filters.datetimeFrom}
              onChange={(v) => update({ datetimeFrom: v })}
              placeholder={t("statsOrders.dateFromPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.dateTo")}
            </Label>
            <DateTimePicker
              value={filters.datetimeTo}
              onChange={(v) => update({ datetimeTo: v })}
              placeholder={t("statsOrders.dateToPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.location")}
            </Label>
            <Select
              value={filters.locationId || "all"}
              onValueChange={(v) => update({ locationId: v === "all" ? "" : v })}
            >
              <SelectTrigger className="h-9 bg-background/50">
                <SelectValue placeholder={t("statsOrders.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("statsOrders.all")}</SelectItem>
                {(locations ?? []).map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.cook")}
            </Label>
            <Select
              value={filters.cookId || "all"}
              onValueChange={(v) => update({ cookId: v === "all" ? "" : v })}
            >
              <SelectTrigger className="h-9 bg-background/50">
                <SelectValue placeholder={t("statsOrders.selectCook")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("statsOrders.all")}</SelectItem>
                {/* Placeholder – cook data not yet in system */}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.orderNumber")}
            </Label>
            <Input
              placeholder={t("statsOrders.orderNumberPlaceholder")}
              value={filters.orderNumber}
              onChange={(e) => update({ orderNumber: e.target.value })}
              className="h-9 bg-background/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.status")}
            </Label>
            <Select
              value={filters.status || "all"}
              onValueChange={(v) => update({ status: v === "all" ? "" : v })}
            >
              <SelectTrigger className="h-9 bg-background/50">
                <SelectValue placeholder={t("statsOrders.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("statsOrders.all")}</SelectItem>
                <SelectItem value={ORDER_STATUS.GATAVOJAS}>
                  {t("statsOrders.statusGatavojas")}
                </SelectItem>
                <SelectItem value={ORDER_STATUS.GATAVS}>
                  {t("statsOrders.statusGatavs")}
                </SelectItem>
                <SelectItem value={ORDER_STATUS.IZSAUKTS}>
                  {t("statsOrders.statusIzsaukts")}
                </SelectItem>
                <SelectItem value={ORDER_STATUS.ATDOTS_KLIENTAM}>
                  {t("statsOrders.statusAtdots")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.takeaway")}
            </Label>
            <Select
              value={filters.takeaway || "all"}
              onValueChange={(v) => update({ takeaway: v === "all" ? "" : v })}
            >
              <SelectTrigger className="h-9 bg-background/50">
                <SelectValue placeholder={t("statsOrders.selectTakeaway")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("statsOrders.all")}</SelectItem>
                <SelectItem value="1">{t("waiter.takeaway")}</SelectItem>
                <SelectItem value="0">{t("waiter.dineIn")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("statsOrders.search")}
            </Label>
            <Input
              placeholder={t("statsOrders.searchPlaceholder")}
              value={filters.searchText}
              onChange={(e) => update({ searchText: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="h-9 bg-background/50"
            />
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 flex gap-2">
          <Button onClick={onSearch} size="sm" className="gap-1.5">
            <Search className="h-3.5 w-3.5 shrink-0" />
            {t("statsOrders.searchBtn")}
          </Button>
          <Button onClick={onClear} variant="outline" size="sm" className="gap-1.5">
            <X className="h-3.5 w-3.5 shrink-0" />
            {t("statsOrders.clearFilters")}
          </Button>
        </div>
      )}
    </div>
  );
}

function getClearedFilters(): OrdersFiltersState {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    ...defaultFilters,
    datetimeFrom: toISODateTime(todayStart),
    datetimeTo: toISODateTime(now),
    takeaway: "",
  };
}

export function useOrdersFiltersState() {
  const [filters, setFilters] = useState<OrdersFiltersState>(loadFilters);

  const clearFilters = (): OrdersFiltersState => {
    const cleared = getClearedFilters();
    setFilters(cleared);
    saveFilters(cleared);
    return cleared;
  };

  return { filters, setFilters, clearFilters };
}
