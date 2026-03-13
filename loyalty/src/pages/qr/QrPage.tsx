/**
 * QR identification page.
 * Displays the customer's unique QR token for scanning at the POS.
 * Requests a screen wake-lock so the display stays on while showing the code.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { useCustomer } from "@/hooks/useCustomer";
import { CUSTOMER_ME_KEY } from "@/services/customer";

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_LABEL: Record<string, string> = {
  bronze:   "Bronza",
  silver:   "Sudrabs",
  gold:     "Zelts",
  platinum: "Platīns",
};

const TIER_COLOR: Record<string, string> = {
  bronze:   "text-orange-600 bg-orange-50",
  silver:   "text-slate-500  bg-slate-50",
  gold:     "text-amber-600  bg-amber-50",
  platinum: "text-violet-600 bg-violet-50",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the raw token from the qr.url path: "/api/customer/qr/<token>" */
function tokenFromUrl(url: string): string {
  return url.split("/").pop() ?? url;
}

/** Keep the screen on while the QR is visible. */
function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;

    navigator.wakeLock
      .request("screen")
      .then((s) => { sentinel = s; })
      .catch(() => { /* not available in all browsers/contexts */ });

    return () => { sentinel?.release(); };
  }, []);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QrPage() {
  useWakeLock();

  const queryClient  = useQueryClient();
  const { data: customer, isLoading, isFetching } = useCustomer();
  const [refreshed, setRefreshed] = useState(false);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: CUSTOMER_ME_KEY });
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 2000);
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!customer) return null;

  const token   = tokenFromUrl(customer.qr.url);
  const tier    = customer.loyalty.tier;
  const name    = customer.displayName ?? customer.email ?? "Klients";
  const tierCls = TIER_COLOR[tier] ?? TIER_COLOR.bronze;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 flex flex-col">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-8 pb-5 text-center">
        <h1 className="text-xl font-bold text-gray-900">Mans QR kods</h1>
        <p className="text-sm text-gray-400 mt-0.5">Parādi, pasūtot ēdienu</p>
      </div>

      {/* ── QR card — centred, maximum white space for scanners ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-xs">

          {/* White QR container */}
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6 flex flex-col items-center gap-5">

            {/* Name + tier */}
            <div className="text-center">
              <p className="text-base font-semibold text-gray-900 truncate max-w-[220px]">{name}</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${tierCls}`}>
                {TIER_LABEL[tier] ?? tier}
              </span>
            </div>

            {/* QR code */}
            <div className="p-3 bg-white rounded-2xl ring-1 ring-gray-100">
              <QRCodeSVG
                value={token}
                size={220}
                level="H"
                marginSize={1}
              />
            </div>

            {/* Instruction */}
            <p className="text-xs text-center text-gray-400 leading-relaxed px-2">
              Uzrādi šo kodu kasierim, lai uzkrātu bonusa punktus
            </p>

            {/* Token hint — truncated, helps staff verify */}
            <p className="font-mono text-[10px] text-gray-300 tracking-wider">
              {token.slice(0, 8).toUpperCase()}…
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 bg-white text-sm text-gray-500 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshed ? "Atjaunots!" : isFetching ? "Atjauno..." : "Atjaunot"}
          </button>

        </div>
      </div>

    </div>
  );
}
