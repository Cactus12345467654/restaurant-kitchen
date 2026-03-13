import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/hooks/use-locations";
import { Search, X } from "lucide-react";

const FILTER_STORAGE_KEY = "table-report-filters";

export interface TableReportFiltersState {
  month: number;
  year: number;
  locationId: string;
}

const MONTHS = [
  { value: 1, labelLv: "Janvāris", labelEn: "January" },
  { value: 2, labelLv: "Februāris", labelEn: "February" },
  { value: 3, labelLv: "Marts", labelEn: "March" },
  { value: 4, labelLv: "Aprīlis", labelEn: "April" },
  { value: 5, labelLv: "Maijs", labelEn: "May" },
  { value: 6, labelLv: "Jūnijs", labelEn: "June" },
  { value: 7, labelLv: "Jūlijs", labelEn: "July" },
  { value: 8, labelLv: "Augusts", labelEn: "August" },
  { value: 9, labelLv: "Septembris", labelEn: "September" },
  { value: 10, labelLv: "Oktobris", labelEn: "October" },
  { value: 11, labelLv: "Novembris", labelEn: "November" },
  { value: 12, labelLv: "Decembris", labelEn: "December" },
];

const now = new Date();
export const defaultTableReportFilters: TableReportFiltersState = {
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  locationId: "",
};

function loadFilters(): TableReportFiltersState {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        month: typeof parsed.month === "number" ? parsed.month : defaultTableReportFilters.month,
        year: typeof parsed.year === "number" ? parsed.year : defaultTableReportFilters.year,
        locationId: parsed.locationId != null ? String(parsed.locationId) : "",
      };
    }
  } catch {}
  return { ...defaultTableReportFilters };
}

function saveFilters(f: TableReportFiltersState) {
  try {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(f));
  } catch {}
}

export function getDefaultTableReportFilters(
  initialLocationId?: number | null
): TableReportFiltersState {
  const stored = loadFilters();
  const loc =
    initialLocationId != null ? String(initialLocationId) : stored.locationId;
  return {
    ...stored,
    locationId: loc || stored.locationId,
  };
}

interface ProductMonthlyTableFiltersProps {
  filters: TableReportFiltersState;
  onFiltersChange: (f: TableReportFiltersState) => void;
  onSearch: () => void;
  onClear: () => void;
}

export function ProductMonthlyTableFilters({
  filters,
  onFiltersChange,
  onSearch,
  onClear,
}: ProductMonthlyTableFiltersProps) {
  const { t, lang } = useTranslation();
  const { data: locations } = useLocations();

  const update = (patch: Partial<TableReportFiltersState>) => {
    const next = { ...filters, ...patch };
    onFiltersChange(next);
    saveFilters(next);
  };

  const getMonthLabel = (m: (typeof MONTHS)[number]) =>
    lang === "lv" ? m.labelLv : m.labelEn;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30 p-4">
      <p className="text-sm font-medium text-muted-foreground mb-4">
        {t("tableReport.filtersTitle")}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("tableReport.month")}</Label>
          <Select
            value={String(filters.month)}
            onValueChange={(v) => update({ month: Number(v) })}
          >
            <SelectTrigger className="h-9 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {getMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("tableReport.year")}</Label>
          <Select
            value={String(filters.year)}
            onValueChange={(v) => update({ year: Number(v) })}
          >
            <SelectTrigger className="h-9 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("tableReport.location")}</Label>
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
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={onSearch} size="sm" className="gap-2">
          <Search className="h-3.5 w-3.5 shrink-0" />
          {t("statsOrders.searchBtn")}
        </Button>
        <Button onClick={onClear} variant="outline" size="sm" className="gap-2">
          <X className="h-3.5 w-3.5 shrink-0" />
          {t("statsOrders.clearFilters")}
        </Button>
      </div>
    </div>
  );
}
