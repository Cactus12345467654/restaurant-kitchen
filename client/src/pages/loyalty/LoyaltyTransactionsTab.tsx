import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateTimePicker } from "@/components/DateTimePicker";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  SlidersHorizontal,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TxItem {
  id: number;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  type: string;
  delta: number;
  balanceAfter: number;
  note: string | null;
  orderId: number | null;
  createdAt: string | null;
}

interface TxResponse {
  items: TxItem[];
  total: number;
  page: number;
  limit: number;
}

interface TxFilters {
  type: string;
  customerSearch: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: TxFilters = {
  type: "",
  customerSearch: "",
  dateFrom: "",
  dateTo: "",
};

const PAGE_SIZES = [25, 50, 100] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildQueryUrl(filters: TxFilters, page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (filters.type)           params.set("type", filters.type);
  if (filters.customerSearch) params.set("customerSearch", filters.customerSearch);
  if (filters.dateFrom)       params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo)         params.set("dateTo", filters.dateTo);
  return `/api/admin/loyalty/transactions?${params.toString()}`;
}

function txTypeConfig(type: string) {
  switch (type) {
    case "earn":    return { label: "loyalty.txTypeEarn",   color: "text-emerald-600 dark:text-emerald-400", icon: TrendingUp,   bg: "bg-emerald-500/10" };
    case "redeem":  return { label: "loyalty.txTypeRedeem", color: "text-amber-600 dark:text-amber-400",   icon: TrendingDown, bg: "bg-amber-500/10"   };
    case "expire":  return { label: "loyalty.txTypeExpire", color: "text-rose-600 dark:text-rose-400",     icon: Clock,        bg: "bg-rose-500/10"    };
    case "adjust":  return { label: "loyalty.txTypeAdjust", color: "text-blue-600 dark:text-blue-400",     icon: SlidersHorizontal, bg: "bg-blue-500/10" };
    case "bonus":   return { label: "loyalty.txTypeBonus",  color: "text-purple-600 dark:text-purple-400", icon: Zap,          bg: "bg-purple-500/10"  };
    default:        return { label: type,                   color: "text-muted-foreground",                icon: ArrowLeftRight, bg: "bg-muted/30"     };
  }
}

// ── Filter panel ──────────────────────────────────────────────────────────────

interface FilterPanelProps {
  draft: TxFilters;
  onChange: (f: TxFilters) => void;
  onSearch: () => void;
  onClear: () => void;
}

function FilterPanel({ draft, onChange, onSearch, onClear }: FilterPanelProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<TxFilters>) => onChange({ ...draft, ...patch });

  return (
    <div className="rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30 p-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>{t("loyalty.txFiltersTitle")}</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("loyalty.txDateFrom")}</Label>
              <DateTimePicker
                value={draft.dateFrom}
                onChange={(v) => update({ dateFrom: v })}
                placeholder={t("loyalty.txDateFrom")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("loyalty.txDateTo")}</Label>
              <DateTimePicker
                value={draft.dateTo}
                onChange={(v) => update({ dateTo: v })}
                placeholder={t("loyalty.txDateTo")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("loyalty.txTypeFilter")}</Label>
              <Select
                value={draft.type || "all"}
                onValueChange={(v) => update({ type: v === "all" ? "" : v })}
              >
                <SelectTrigger className="h-9 bg-background/50">
                  <SelectValue placeholder={t("loyalty.txTypeAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("loyalty.txTypeAll")}</SelectItem>
                  <SelectItem value="earn">{t("loyalty.txTypeEarn")}</SelectItem>
                  <SelectItem value="redeem">{t("loyalty.txTypeRedeem")}</SelectItem>
                  <SelectItem value="expire">{t("loyalty.txTypeExpire")}</SelectItem>
                  <SelectItem value="adjust">{t("loyalty.txTypeAdjust")}</SelectItem>
                  <SelectItem value="bonus">{t("loyalty.txTypeBonus")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("loyalty.txCustomerFilter")}</Label>
              <Input
                placeholder={t("loyalty.txCustomerPlaceholder")}
                value={draft.customerSearch}
                onChange={(e) => update({ customerSearch: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                className="h-9 bg-background/50"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={onSearch} size="sm" className="gap-1.5">
              <Search className="h-3.5 w-3.5 shrink-0" />
              {t("loyalty.txSearch")}
            </Button>
            <Button onClick={onClear} variant="outline" size="sm" className="gap-1.5">
              <X className="h-3.5 w-3.5 shrink-0" />
              {t("loyalty.txClear")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></TableCell>
          <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24 hidden lg:block" /></TableCell>
          <TableCell><Skeleton className="h-4 w-10" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LoyaltyTransactionsTab() {
  const { t } = useTranslation();

  const [draft, setDraft] = useState<TxFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<TxFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const url = buildQueryUrl(applied, page, pageSize);

  const { data, isLoading, isError } = useQuery<TxResponse>({
    queryKey: ["admin-loyalty-transactions", url],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const handleSearch = () => {
    setApplied(draft);
    setPage(1);
  };

  const handleClear = () => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <FilterPanel
        draft={draft}
        onChange={setDraft}
        onSearch={handleSearch}
        onClear={handleClear}
      />

      {/* Record count */}
      <p className="text-sm text-muted-foreground">
        {t("loyalty.txTotalRecords")}:{" "}
        <strong>{isLoading ? "..." : (data?.total ?? 0)}</strong>
        {!isLoading && data?.total === 0 && (
          <span className="ml-2 text-muted-foreground/70">({t("loyalty.txNoDataHint")})</span>
        )}
      </p>

      {/* Table */}
      <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("loyalty.txColCustomer")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("loyalty.txColType")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">{t("loyalty.txColDelta")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">{t("loyalty.txColBalance")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">{t("loyalty.txColNote")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">{t("loyalty.txColOrder")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("loyalty.txColDate")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && <SkeletonRows count={8} />}

            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 text-destructive/60" />
                    <p className="text-sm font-medium">{t("loyalty.txError")}</p>
                    <p className="text-xs">{t("common.tryAgain")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ArrowLeftRight className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">{t("loyalty.noTransactions")}</p>
                    <p className="text-xs text-muted-foreground/70">{t("loyalty.txNoDataHint")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data?.items.map((tx) => {
              const cfg = txTypeConfig(tx.type);
              const TypeIcon = cfg.icon;
              const isPositive = tx.delta > 0;

              return (
                <TableRow key={tx.id} className="hover:bg-muted/20 transition-colors">
                  {/* Customer */}
                  <TableCell>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {tx.customerName ?? tx.customerEmail ?? tx.customerId.slice(0, 8)}
                      </span>
                      {tx.customerEmail && (
                        <span className="text-xs text-muted-foreground truncate">{tx.customerEmail}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Type badge */}
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                      <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                      {t(cfg.label as Parameters<typeof t>[0])}
                    </span>
                  </TableCell>

                  {/* Delta */}
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    <span className={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                      {isPositive ? "+" : ""}{tx.delta}
                    </span>
                  </TableCell>

                  {/* Balance after */}
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {tx.balanceAfter}
                  </TableCell>

                  {/* Note */}
                  <TableCell className="hidden lg:table-cell max-w-[200px]">
                    {tx.note ? (
                      <span className="text-xs text-muted-foreground truncate block" title={tx.note}>
                        {tx.note}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>

                  {/* Order */}
                  <TableCell className="text-center">
                    {tx.orderId ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        #{tx.orderId}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {tx.createdAt
                      ? format(new Date(tx.createdAt), "dd.MM.yyyy HH:mm")
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        {data && data.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 dark:border-white/50 bg-muted/20 flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t("statsOrders.rowsPerPage")}:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.total)}{" "}
                {t("statsOrders.of")} {data.total}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
