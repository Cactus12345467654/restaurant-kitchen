import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, MapPin, Radio, Printer } from "lucide-react";
import { useLocationWithUrlSync } from "@/hooks/use-location-with-url-sync";
import { usePagerMode, usePrinterMode } from "@/hooks/use-waiter-modes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";

export default function Waiter() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { locationId: selectedLocationId, setLocationId: setSelectedLocationId, locations, showLocationSelector } = useLocationWithUrlSync();
  const currentLocation = locations?.find((l) => l.id === selectedLocationId);
  const [pagerMode, setPagerMode] = usePagerMode();
  const [printerMode, setPrinterMode] = usePrinterMode();

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager", "waiter"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("dashboard.waiterScreen")}</h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.waiterDesc")}</p>
        </div>

        {showLocationSelector && locations?.length ? (
          <Select
            value={selectedLocationId?.toString() ?? ""}
            onValueChange={(v) => setSelectedLocationId(v ? Number(v) : null)}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder={t("waiter.selectLocation")} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id.toString()}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : currentLocation ? (
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1.5 gap-1.5 rounded-lg"
          >
            <MapPin className="w-3.5 h-3.5" />
            {currentLocation.name}
          </Badge>
        ) : null}

        <div className="flex flex-col gap-2 w-[280px]">
          <Button
            onClick={() => window.open(`/waiter/view?locationId=${selectedLocationId}`, "_blank")}
            className="gap-2 justify-center w-full"
            disabled={!selectedLocationId}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {t("dashboard.openWaiter")}
          </Button>
          <Button
            variant="outline"
            className="gap-2 justify-center w-full"
            disabled={!selectedLocationId}
            onClick={() => {
              const url = `${window.location.origin}/waiter/view?locationId=${selectedLocationId}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: t("common.linkCopied") }));
            }}
          >
            <Copy className="h-4 w-4 shrink-0" />
            {t("common.copyLink")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPagerMode(!pagerMode)}
            className={`gap-2 justify-center w-full ${
              pagerMode ? "border-primary bg-primary/15 text-primary" : ""
            }`}
          >
            <Radio className="h-4 w-4 shrink-0" />
            {t("waiter.pagers")}: {pagerMode ? t("waiter.pagersOn") : t("waiter.pagersOff")}
          </Button>
          <Button
            variant="outline"
            onClick={() => setPrinterMode(!printerMode)}
            className={`gap-2 justify-center w-full ${
              printerMode ? "border-primary bg-primary/15 text-primary" : ""
            }`}
          >
            <Printer className="h-4 w-4 shrink-0" />
            {t("waiter.printer")}: {printerMode ? t("waiter.printerOn") : t("waiter.printerOff")}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
