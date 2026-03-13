/**
 * Offers page.
 * Lists active offers available to the customer and their activated vouchers.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOffers, fetchActiveVouchers, activateOffer } from "@/services/loyalty";
import { cn } from "@/lib/utils";
import type { Offer, OfferActivation } from "@/api/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<OfferActivation["status"], string> = {
  active:    "Aktīvs",
  used:      "Izmantots",
  expired:   "Beidzies",
  cancelled: "Atcelts",
};

const STATUS_STYLE: Record<OfferActivation["status"], string> = {
  active:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  used:      "bg-gray-50    text-gray-400    border-gray-200",
  expired:   "bg-gray-50    text-gray-400    border-gray-200",
  cancelled: "bg-red-50     text-red-400     border-red-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("lv-LV", {
    day: "numeric", month: "short", year: "numeric",
  });
}

async function copyToClipboard(text: string) {
  try { await navigator.clipboard.writeText(text); } catch { /* silent */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VoucherCard({
  activation,
  offerTitle,
}: {
  activation: OfferActivation;
  offerTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const style = STATUS_STYLE[activation.status] ?? STATUS_STYLE.active;

  function handleCopy() {
    copyToClipboard(activation.voucherCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{offerTitle}</p>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border shrink-0", style)}>
          {STATUS_LABEL[activation.status]}
        </span>
      </div>

      {/* Voucher code — tappable to copy */}
      <button
        onClick={handleCopy}
        className="w-full flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
      >
        <span className="font-mono text-xl font-bold tracking-widest text-gray-900">
          {activation.voucherCode}
        </span>
        <span className="text-xs text-gray-400 ml-3 shrink-0">
          {copied ? "Nokopēts!" : "Kopēt"}
        </span>
      </button>

      <p className="text-xs text-gray-400 mt-2">
        Derīgs līdz: {formatDate(activation.expiresAt)}
      </p>
    </div>
  );
}

function OfferCard({
  offer,
  activation,
  onActivate,
  activating,
}: {
  offer: Offer;
  activation?: OfferActivation;
  onActivate: (id: number) => void;
  activating: boolean;
}) {
  const alreadyActive = activation?.status === "active";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Image */}
      {offer.imageUrl && (
        <img
          src={offer.imageUrl}
          alt={offer.title}
          className="w-full h-36 object-cover"
        />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-base font-semibold text-gray-900 leading-snug">{offer.title}</h3>
          {/* Points badge */}
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full shrink-0",
            offer.pointsRequired > 0
              ? "bg-orange-100 text-orange-700"
              : "bg-emerald-100 text-emerald-700",
          )}>
            {offer.pointsRequired > 0 ? `${offer.pointsRequired} pk.` : "Bezmaksas"}
          </span>
        </div>

        {offer.description && (
          <p className="text-sm text-gray-500 leading-snug line-clamp-2 mb-3">
            {offer.description}
          </p>
        )}

        <p className="text-xs text-gray-400 mb-3">
          Derīgs līdz: {formatDate(offer.validUntil)}
        </p>

        {alreadyActive ? (
          <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl py-2.5 text-sm font-medium">
            <span>✓</span>
            <span>Aktivizēts</span>
          </div>
        ) : (
          <button
            onClick={() => onActivate(offer.id)}
            disabled={activating}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {activating ? "Aktivizē..." : "Aktivizēt"}
          </button>
        )}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-4 pt-8 space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-10 bg-gray-200 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const OFFERS_KEY   = ["/customer/me/offers"];
const VOUCHERS_KEY = ["/customer/me/offers/active"];

export default function OffersPage() {
  const queryClient = useQueryClient();
  const [activatingId, setActivatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const offersQuery = useQuery({
    queryKey: OFFERS_KEY,
    queryFn: fetchOffers,
    staleTime: 60_000,
  });

  const vouchersQuery = useQuery({
    queryKey: VOUCHERS_KEY,
    queryFn: fetchActiveVouchers,
    staleTime: 30_000,
  });

  const activateMutation = useMutation({
    mutationFn: (offerId: number) => {
      setActivatingId(offerId);
      return activateOffer(offerId);
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: OFFERS_KEY });
      queryClient.invalidateQueries({ queryKey: VOUCHERS_KEY });
    },
    onError: (err: Error) => {
      setError(err.message ?? "Neizdevās aktivizēt piedāvājumu");
    },
    onSettled: () => setActivatingId(null),
  });

  const isLoading = offersQuery.isLoading || vouchersQuery.isLoading;
  if (isLoading) return <Skeleton />;

  const offers   = offersQuery.data  ?? [];
  const vouchers = vouchersQuery.data ?? [];

  // Build a quick lookup: offerId → activation
  const activationByOffer = new Map(vouchers.map((v) => [v.offerId, v]));

  // For voucher cards we need the offer title — build a lookup from offers
  const offerById = new Map(offers.map((o) => [o.id, o]));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Header ── */}
      <div className="bg-white px-4 pt-8 pb-5 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">Piedāvājumi</h1>
        <p className="text-sm text-gray-400 mt-0.5">Ekskluzīvas akcijas tev</p>
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* ── Global error ── */}
        {(offersQuery.isError || vouchersQuery.isError) && (
          <div className="p-4 bg-red-50 rounded-xl text-sm text-red-500 text-center">
            Neizdevās ielādēt piedāvājumus
          </div>
        )}

        {/* ── Activation error ── */}
        {error && (
          <div className="p-3 bg-red-50 rounded-xl text-sm text-red-500 text-center">
            {error}
          </div>
        )}

        {/* ── My vouchers ── */}
        {vouchers.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Mani kuponi
            </h2>
            <div className="space-y-3">
              {vouchers.map((v) => (
                <VoucherCard
                  key={v.id}
                  activation={v}
                  offerTitle={offerById.get(v.offerId)?.title ?? `Piedāvājums #${v.offerId}`}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Available offers ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Pieejamie piedāvājumi
          </h2>

          {offers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🎁</p>
              <p className="text-sm font-medium text-gray-700">Šobrīd nav aktīvu piedāvājumu</p>
              <p className="text-xs text-gray-400 mt-1">Pārbaudiet vēlāk</p>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  activation={activationByOffer.get(offer.id)}
                  onActivate={(id) => activateMutation.mutate(id)}
                  activating={activatingId === offer.id && activateMutation.isPending}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
