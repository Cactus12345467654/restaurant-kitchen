/**
 * Loyalty points page.
 * Shows the customer's current balance, tier progress,
 * and a chronological list of point transactions.
 */
import { useQuery } from "@tanstack/react-query";
import { useCustomer } from "@/hooks/useCustomer";
import { fetchTransactions } from "@/services/loyalty";
import { formatPoints } from "@/lib/utils";
import type { LoyaltyTransaction, TransactionType } from "@/api/types";

// ── Transaction metadata ─────────────────────────────────────────────────────

const TYPE_LABEL: Record<TransactionType, string> = {
  earn:    "Nopelnīti",
  redeem:  "Izlietoti",
  expire:  "Beidzies termiņš",
  adjust:  "Korekcija",
  bonus:   "Bonuss",
};

const TYPE_COLOR: Record<TransactionType, string> = {
  earn:    "text-emerald-600",
  redeem:  "text-red-500",
  expire:  "text-gray-400",
  adjust:  "text-blue-500",
  bonus:   "text-orange-500",
};

const TYPE_BG: Record<TransactionType, string> = {
  earn:    "bg-emerald-50",
  redeem:  "bg-red-50",
  expire:  "bg-gray-50",
  adjust:  "bg-blue-50",
  bonus:   "bg-orange-50",
};

const TIER_LABEL: Record<string, string> = {
  bronze:   "Bronza",
  silver:   "Sudrabs",
  gold:     "Zelts",
  platinum: "Platīns",
};

const TIER_PROGRESS_COLOR: Record<string, string> = {
  bronze:   "bg-orange-400",
  silver:   "bg-slate-400",
  gold:     "bg-amber-400",
  platinum: "bg-violet-400",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("lv-LV", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

function deltaLabel(delta: number): string {
  return delta > 0 ? `+${formatPoints(delta)}` : formatPoints(delta);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: LoyaltyTransaction }) {
  const type  = tx.type as TransactionType;
  const color = TYPE_COLOR[type] ?? "text-gray-600";
  const bg    = TYPE_BG[type]    ?? "bg-gray-50";

  return (
    <li className="flex items-center gap-3 py-3">
      {/* Type dot */}
      <span className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
        <span className={`text-base font-bold leading-none ${color}`}>
          {tx.delta > 0 ? "+" : "−"}
        </span>
      </span>

      {/* Label + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">
          {tx.note ?? TYPE_LABEL[type] ?? type}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</p>
      </div>

      {/* Delta + balance */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${color}`}>{deltaLabel(tx.delta)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatPoints(tx.balanceAfter)} pk.</p>
      </div>
    </li>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3 px-4 pt-4">
      <div className="h-32 bg-gray-200 rounded-2xl" />
      <div className="h-5 bg-gray-200 rounded w-1/3" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
          </div>
          <div className="w-12 h-3 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const { data: customer, isLoading: customerLoading } = useCustomer();

  const txQuery = useQuery({
    queryKey: ["/customer/me/transactions", 1, 20],
    queryFn:  () => fetchTransactions(1, 20),
    enabled:  !!customer,
    staleTime: 30_000,
  });

  if (customerLoading) return <Skeleton />;
  if (!customer) return null;

  const { loyalty } = customer;
  const tier = loyalty.tier;
  const progressPct = loyalty.nextTierAt
    ? Math.min(100, Math.round((loyalty.balance / loyalty.nextTierAt) * 100))
    : 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Balance card ── */}
      <div className="bg-white px-4 pt-8 pb-6 border-b border-gray-100">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Mans atlikums</p>

        <p className="text-5xl font-bold text-gray-900 mt-1 tabular-nums">
          {formatPoints(loyalty.balance)}
        </p>
        <p className="text-sm text-gray-400 mt-0.5">punkti</p>

        {/* Tier + progress */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">{TIER_LABEL[tier] ?? tier}</span>
            {loyalty.nextTierAt !== null ? (
              <span className="text-xs text-gray-400">
                {formatPoints(loyalty.nextTierAt)} līdz nākamajam
              </span>
            ) : (
              <span className="text-xs text-violet-500 font-medium">Augstākais līmenis</span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${TIER_PROGRESS_COLOR[tier] ?? "bg-orange-400"}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Lifetime total */}
        <p className="text-xs text-gray-400 mt-3">
          Kopā nopelnīti:{" "}
          <span className="font-medium text-gray-600">{formatPoints(loyalty.lifetimePoints)} punkti</span>
        </p>
      </div>

      {/* ── Transaction list ── */}
      <div className="px-4 pt-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Transakciju vēsture
        </h2>

        {txQuery.isError && (
          <div className="mt-3 p-4 bg-red-50 rounded-xl text-sm text-red-500 text-center">
            Neizdevās ielādēt transakcijas
          </div>
        )}

        {txQuery.isLoading && (
          <div className="mt-4 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="w-12 h-3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        )}

        {txQuery.data && (
          txQuery.data.items.length === 0 ? (
            <div className="mt-6 py-12 text-center">
              <p className="text-4xl mb-3">🌟</p>
              <p className="text-sm font-medium text-gray-700">Vēl nav transakciju</p>
              <p className="text-xs text-gray-400 mt-1">
                Tev šeit parādīsies punktu vēsture
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 bg-white rounded-2xl px-4 mt-2 shadow-sm border border-gray-100">
              {txQuery.data.items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
