import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useTranslation } from "@/i18n";
import { useAuth, canSelectLocation, hasRole } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoyaltyTransactionsTab } from "./LoyaltyTransactionsTab";
import { LoyaltyOffersTab } from "./LoyaltyOffersTab";
import { LoyaltyCustomersTab } from "./LoyaltyCustomersTab";
import {
  Gift,
  Trophy,
  Settings,
  Clock,
  ExternalLink,
  Copy,
} from "lucide-react";


function RewardsTab() {
  const { t } = useTranslation();
  return (
    <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl p-12">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-primary" />
        </div>
        <div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-foreground">{t("loyalty.tabRewards")}</h2>
            <Badge variant="secondary" className="text-xs gap-1">
              <Clock className="w-3 h-3" />
              {t("loyalty.comingSoon")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{t("loyalty.comingSoonDesc")}</p>
        </div>
      </div>
    </Card>
  );
}

function SettingsTab() {
  const { t } = useTranslation();

  const tiers = [
    { name: "Bronze",   threshold: "0",    color: "bg-amber-700/20 text-amber-700 dark:text-amber-400" },
    { name: "Silver",   threshold: "100",  color: "bg-slate-400/20 text-slate-600 dark:text-slate-300" },
    { name: "Gold",     threshold: "500",  color: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
    { name: "Platinum", threshold: "2000", color: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400" },
  ];

  return (
    <div className="space-y-4">
      {/* Points rate */}
      <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">{t("loyalty.settingsTitle")}</h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-border/50 dark:border-white/50">
                <span className="text-sm text-muted-foreground">{t("loyalty.settingsRateLabel")}</span>
                <Badge className="font-mono text-xs">{t("loyalty.settingsRateValue")}</Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-3">{t("loyalty.settingsTiersLabel")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {tiers.map((tier) => (
                    <div
                      key={tier.name}
                      className="rounded-xl border border-border/50 dark:border-white/20 p-3 text-center"
                    >
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1 ${tier.color}`}>
                        {tier.name}
                      </span>
                      <p className="text-lg font-bold text-foreground">{tier.threshold}</p>
                      <p className="text-xs text-muted-foreground">punkti</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LoyaltyPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const { toast } = useToast();
  const { data: loyaltyUrlConfig } = useQuery({
    queryKey: ["public", "loyalty-app-url"],
    queryFn: async () => {
      const res = await fetch("/api/public/loyalty-app-url", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch loyalty app URL");
      const { url } = (await res.json()) as { url: string };
      return url;
    },
  });
  const isSuperAdmin = hasRole(user, "super_admin");
  const showLocationSelector = canSelectLocation(user);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    isSuperAdmin ? null : (canSelectLocation(user) ? null : (user?.locationId ?? null)),
  );

  useEffect(() => {
    if (isSuperAdmin && locations?.length && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    } else if (showLocationSelector && !selectedLocationId && locations?.length) {
      setSelectedLocationId(locations[0].id);
    } else if (!showLocationSelector) {
      const userLocId = user?.locationId ?? (user as { location_id?: number })?.location_id ?? null;
      if (userLocId != null && selectedLocationId !== userLocId) setSelectedLocationId(userLocId);
    }
  }, [isSuperAdmin, showLocationSelector, user, locations, selectedLocationId]);

  const baseUrl = loyaltyUrlConfig ?? "";
  const loyaltyUrl = baseUrl
    ? selectedLocationId
      ? `${baseUrl}?locationId=${selectedLocationId}`
      : baseUrl
    : "";

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin"]}>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Gift className="w-7 h-7 text-primary" />
              {t("loyalty.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("loyalty.subtitle")}</p>
          </div>

          {showLocationSelector && locations && locations.length > 0 && (
            <Select
              value={selectedLocationId?.toString() ?? ""}
              onValueChange={(v) => setSelectedLocationId(Number(v))}
            >
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder={t("dashboard.selectLocation")} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id.toString()}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => window.open(loyaltyUrl, "_blank")}
              className="gap-2"
              disabled={(showLocationSelector && !selectedLocationId) || !loyaltyUrl}
            >
              <ExternalLink className="h-4 w-4" />
              {t("loyalty.openApp")}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={(showLocationSelector && !selectedLocationId) || !loyaltyUrl}
              onClick={() => {
                navigator.clipboard.writeText(loyaltyUrl).then(() =>
                  toast({ title: t("common.linkCopied") }),
                );
              }}
            >
              <Copy className="h-4 w-4" />
              {t("loyalty.copyLink")}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1 bg-muted/50 border border-border/50 dark:border dark:border-white/50 rounded-xl">
            <TabsTrigger
              value="customers"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("loyalty.tabCustomers")}
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("loyalty.tabTransactions")}
            </TabsTrigger>
            <TabsTrigger
              value="offers"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("loyalty.tabOffers")}
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("loyalty.tabRewards")}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {t("loyalty.tabSettings")}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="customers">
              <LoyaltyCustomersTab />
            </TabsContent>
            <TabsContent value="transactions">
              <LoyaltyTransactionsTab />
            </TabsContent>
            <TabsContent value="offers">
              <LoyaltyOffersTab />
            </TabsContent>
            <TabsContent value="rewards">
              <RewardsTab />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
