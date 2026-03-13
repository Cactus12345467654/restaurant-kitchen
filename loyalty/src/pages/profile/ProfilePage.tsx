/**
 * Customer profile page.
 * Shows avatar, name, email, loyalty tier, points balance.
 * Allows editing display name and language.
 * Provides logout.
 */
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCustomer } from "@/hooks/useCustomer";
import { updateCustomerMe, CUSTOMER_ME_KEY } from "@/services/customer";
import { logout } from "@/auth/service";
import { cn, formatPoints } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

const TIER_BADGE: Record<string, string> = {
  bronze:   "bg-orange-100 text-orange-700",
  silver:   "bg-slate-100  text-slate-600",
  gold:     "bg-amber-100  text-amber-700",
  platinum: "bg-violet-100 text-violet-700",
};

const TIER_LABEL: Record<string, string> = {
  bronze:   "Bronza",
  silver:   "Sudrabs",
  gold:     "Zelts",
  platinum: "Platīns",
};

const LANGUAGES = [
  { value: "lv", label: "Latviešu" },
  { value: "en", label: "English" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? "?";
  return src
    .split(/[\s@]/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: customer, isLoading } = useCustomer();

  const [editing, setEditing] = useState(false);
  const [nameField, setNameField] = useState("");
  const [langField, setLangField] = useState("lv");

  // Populate form fields whenever we enter edit mode
  function openEdit() {
    setNameField(customer?.displayName ?? "");
    setLangField(customer?.preferredLanguage ?? "lv");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    saveMutation.reset();
  }

  // Keep local state in sync if the query refetches while not editing
  useEffect(() => {
    if (!editing && customer) {
      setNameField(customer.displayName ?? "");
      setLangField(customer.preferredLanguage);
    }
  }, [customer, editing]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateCustomerMe({
        displayName: nameField.trim() || null,
        preferredLanguage: langField,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(CUSTOMER_ME_KEY, updated);
      setEditing(false);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logout(queryClient),
    onSuccess: () => setLocation("/login"),
  });

  // ── Render states ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!customer) return null;

  const tier = customer.loyalty.tier;
  const badgeClass = TIER_BADGE[tier] ?? TIER_BADGE.bronze;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ── Header / Avatar ── */}
      <div className="bg-white pt-10 pb-6 px-4 text-center border-b border-gray-100">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-orange-100 flex items-center justify-center ring-4 ring-orange-50">
          {customer.avatarUrl ? (
            <img
              src={customer.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-orange-500 select-none">
              {initials(customer.displayName, customer.email)}
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900 leading-tight">
          {customer.displayName ?? "—"}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{customer.email}</p>

        <span className={cn("inline-block mt-3 px-3 py-0.5 rounded-full text-xs font-semibold", badgeClass)}>
          {TIER_LABEL[tier] ?? tier}
        </span>
      </div>

      <div className="px-4 pt-5 space-y-3">

        {/* ── Points summary ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Punktu atlikums</p>
          <p className="text-3xl font-bold text-gray-900">{formatPoints(customer.loyalty.balance)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Kopā nopelnīti: <span className="font-medium text-gray-600">{formatPoints(customer.loyalty.lifetimePoints)}</span>
          </p>
          {customer.loyalty.nextTierAt !== null && (
            <p className="text-xs text-orange-500 mt-1">
              Līdz nākamajam līmenim: {formatPoints(customer.loyalty.nextTierAt)} punkti
            </p>
          )}
        </div>

        {/* ── Profile info / edit form ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Profila informācija</h2>
            {!editing && (
              <button
                onClick={openEdit}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                Labot
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1" htmlFor="displayName">
                  Vārds
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                  placeholder="Ievadiet savu vārdu"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1" htmlFor="language">
                  Valoda
                </label>
                <select
                  id="language"
                  value={langField}
                  onChange={(e) => setLangField(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {saveMutation.isError && (
                <p className="text-xs text-red-500">Neizdevās saglabāt. Mēģiniet vēlreiz.</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saglabā..." : "Saglabāt"}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={saveMutation.isPending}
                  className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Atcelt
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Vārds</dt>
                <dd className="font-medium text-gray-800">{customer.displayName ?? "—"}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">E-pasts</dt>
                <dd className="text-gray-700 text-right break-all">{customer.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Valoda</dt>
                <dd className="text-gray-700">
                  {LANGUAGES.find((l) => l.value === customer.preferredLanguage)?.label
                    ?? customer.preferredLanguage}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-400">Reģistrējies</dt>
                <dd className="text-gray-700">
                  {new Date(customer.createdAt).toLocaleDateString("lv-LV")}
                </dd>
              </div>
            </dl>
          )}
        </div>

        {/* ── Logout ── */}
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full bg-white border border-gray-200 text-red-500 rounded-2xl py-3 text-sm font-medium shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {logoutMutation.isPending ? "Iziet..." : "Iziet no konta"}
        </button>

      </div>
    </div>
  );
}
