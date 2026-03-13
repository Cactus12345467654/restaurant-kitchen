import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  SlidersHorizontal,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
  balance: number;
  lifetimePoints: number;
  tier: string;
}

interface CustomersResponse {
  items: CustomerRow[];
  total: number;
  page: number;
  limit: number;
}

interface AdjustForm {
  direction: "add" | "subtract";
  amount: number;
  note: string;
}

const PAGE_SIZES = [25, 50, 100] as const;
const QUERY_KEY = (search: string, page: number, limit: number) =>
  ["admin-loyalty-customers", search, page, limit];

// ── Tier helpers ──────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { label: string; cls: string }> = {
  bronze:   { label: "Bronze",   cls: "bg-amber-700/15 text-amber-700 dark:text-amber-400" },
  silver:   { label: "Silver",   cls: "bg-slate-400/20 text-slate-600 dark:text-slate-300" },
  gold:     { label: "Gold",     cls: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  platinum: { label: "Platinum", cls: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
};

function TierBadge({ tier }: { tier: string }) {
  const s = TIER_STYLES[tier] ?? TIER_STYLES.bronze;
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

function CustomerAvatar({ name, email, avatarUrl }: { name: string | null; email: string | null; avatarUrl: string | null }) {
  const initials = (name ?? email ?? "?").charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
      {avatarUrl ? (
        <img src={avatarUrl} alt={name ?? "customer"} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-primary">{initials}</span>
      )}
    </div>
  );
}

// ── Adjust modal ──────────────────────────────────────────────────────────────

interface AdjustModalProps {
  customer: CustomerRow | null;
  open: boolean;
  onClose: () => void;
}

function AdjustModal({ customer, open, onClose }: AdjustModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState<AdjustForm>({ direction: "add", amount: 0, note: "" });
  const [formError, setFormError] = useState("");

  const update = (patch: Partial<AdjustForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setFormError("");
  };

  const delta = form.direction === "add" ? form.amount : -form.amount;
  const newBalance = (customer?.balance ?? 0) + delta;

  const adjustMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/loyalty/customers/${customer!.id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delta, note: form.note.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Adjustment failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-loyalty-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-loyalty-transactions"] });
      toast({ title: t("loyalty.cust.adjustSuccess") });
      handleClose();
    },
    onError: (err: Error) => {
      if (err.message.toLowerCase().includes("below 0")) {
        setFormError(t("loyalty.cust.balanceFloor"));
      } else {
        setFormError(err.message);
      }
    },
  });

  const handleClose = () => {
    setForm({ direction: "add", amount: 0, note: "" });
    setFormError("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.amount || form.amount <= 0) {
      setFormError(t("loyalty.cust.adjustAmount") + " " + t("common.required"));
      return;
    }
    if (!form.note.trim()) {
      setFormError(t("loyalty.cust.adjustReason") + " " + t("common.required"));
      return;
    }
    if (newBalance < 0) {
      setFormError(t("loyalty.cust.balanceFloor"));
      return;
    }
    adjustMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            {t("loyalty.cust.adjustTitle")}
          </DialogTitle>
        </DialogHeader>

        {customer && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            {/* Customer info */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border/50 dark:border-white/10 p-3">
              <CustomerAvatar
                name={customer.displayName}
                email={customer.email}
                avatarUrl={customer.avatarUrl}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {customer.displayName ?? customer.email ?? customer.id.slice(0, 12)}
                </p>
                {customer.email && (
                  <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                )}
              </div>
              <TierBadge tier={customer.tier} />
            </div>

            {/* Current / new balance preview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/30 border border-border/50 dark:border-white/10 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t("loyalty.cust.adjustCurrentBalance")}</p>
                <p className="text-xl font-bold text-foreground font-mono">{customer.balance}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center transition-colors ${
                newBalance < 0
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-primary/5 border-primary/20"
              }`}>
                <p className="text-xs text-muted-foreground mb-1">{t("loyalty.cust.adjustNewBalance")}</p>
                <p className={`text-xl font-bold font-mono ${newBalance < 0 ? "text-destructive" : "text-primary"}`}>
                  {newBalance}
                </p>
              </div>
            </div>

            {/* Direction + amount */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("loyalty.cust.adjustAmount")}</Label>
              <div className="flex gap-2">
                {/* Direction toggle */}
                <div className="flex rounded-lg border border-border/50 dark:border-white/20 overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => update({ direction: "add" })}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                      form.direction === "add"
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("loyalty.cust.adjustAdd")}
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ direction: "subtract" })}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border/50 dark:border-white/20 ${
                      form.direction === "subtract"
                        ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        : "text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    {t("loyalty.cust.adjustSubtract")}
                  </button>
                </div>

                {/* Amount */}
                <Input
                  type="number"
                  min={1}
                  value={form.amount || ""}
                  onChange={(e) => update({ amount: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="bg-background/50 font-mono"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("loyalty.cust.adjustReason")}</Label>
              <Input
                value={form.note}
                onChange={(e) => update({ note: e.target.value })}
                placeholder={t("loyalty.cust.adjustReasonPlaceholder")}
                className="bg-background/50"
              />
            </div>

            {formError && (
              <p className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </p>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={adjustMutation.isPending}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={adjustMutation.isPending || newBalance < 0}
                className="gap-2"
              >
                {adjustMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </TableCell>
          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-7 w-20" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LoyaltyCustomersTab() {
  const { t } = useTranslation();

  const [searchDraft, setSearchDraft] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [adjustTarget, setAdjustTarget] = useState<CustomerRow | null>(null);

  const url = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(pageSize));
    if (searchApplied) p.set("search", searchApplied);
    return `/api/admin/loyalty/customers?${p.toString()}`;
  }, [searchApplied, page, pageSize]);

  const { data, isLoading, isError } = useQuery<CustomersResponse>({
    queryKey: QUERY_KEY(searchApplied, page, pageSize),
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  const handleSearch = () => {
    setSearchApplied(searchDraft);
    setPage(1);
  };

  const handleClear = () => {
    setSearchDraft("");
    setSearchApplied("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder={t("loyalty.cust.searchPlaceholder")}
            className="pl-9 bg-background/50"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch} className="gap-1.5">
          <Search className="w-3.5 h-3.5" />
          {t("loyalty.txSearch")}
        </Button>
        {searchApplied && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5 text-muted-foreground">
            {t("loyalty.txClear")}
          </Button>
        )}
      </div>

      {/* Record count */}
      <p className="text-sm text-muted-foreground">
        {t("loyalty.cust.total")}:{" "}
        <strong>{isLoading ? "..." : (data?.total ?? 0)}</strong>
      </p>

      {/* Table */}
      <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("loyalty.cust.colCustomer")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("loyalty.cust.colTier")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {t("loyalty.cust.colBalance")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right hidden md:table-cell">
                {t("loyalty.cust.colLifetime")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                {t("loyalty.cust.colRegistered")}
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && <SkeletonRows count={8} />}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-8 h-8 text-destructive/60" />
                    <p className="text-sm font-medium">{t("common.error")}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && data?.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">
                      {searchApplied ? t("loyalty.cust.noSearch") : t("loyalty.noCustomers")}
                    </p>
                    {!searchApplied && (
                      <p className="text-xs text-muted-foreground/70 max-w-xs">
                        {t("loyalty.noCustomersDesc")}
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && (data?.items ?? []).map((customer) => (
              <TableRow key={customer.id} className="hover:bg-muted/20 transition-colors">
                {/* Customer */}
                <TableCell>
                  <div className="flex items-center gap-3 min-w-0">
                    <CustomerAvatar
                      name={customer.displayName}
                      email={customer.email}
                      avatarUrl={customer.avatarUrl}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {customer.displayName ?? customer.email ?? customer.id.slice(0, 12)}
                      </p>
                      {customer.email && (
                        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Tier */}
                <TableCell>
                  <TierBadge tier={customer.tier} />
                </TableCell>

                {/* Balance */}
                <TableCell className="text-right font-mono text-sm font-semibold text-foreground">
                  {customer.balance}
                </TableCell>

                {/* Lifetime */}
                <TableCell className="text-right font-mono text-sm text-muted-foreground hidden md:table-cell">
                  {customer.lifetimePoints}
                </TableCell>

                {/* Registered */}
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden lg:table-cell">
                  {customer.createdAt
                    ? format(new Date(customer.createdAt), "dd.MM.yyyy")
                    : "—"}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setAdjustTarget(customer)}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    {t("loyalty.cust.adjustBtn")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
                variant="outline" size="icon" className="h-7 w-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline" size="icon" className="h-7 w-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Adjustment modal */}
      <AdjustModal
        customer={adjustTarget}
        open={adjustTarget !== null}
        onClose={() => setAdjustTarget(null)}
      />
    </div>
  );
}
