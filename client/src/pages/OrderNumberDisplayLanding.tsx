import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExternalLink, Copy, MapPin, ImagePlus, Trash2 } from "lucide-react";
import { useAuth, canSelectLocation, hasRole } from "@/hooks/use-auth";
import { useLocations, useUpdateWaitingImage } from "@/hooks/use-locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { resolveImageUrl } from "@/lib/utils";

export default function OrderNumberDisplayLanding() {
  const { user } = useAuth();
  const { data: locations } = useLocations();
  const updateWaitingImage = useUpdateWaitingImage();
  const isSuperAdmin = hasRole(user, "super_admin");
  const showLocationSelector = canSelectLocation(user);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    isSuperAdmin ? null : (canSelectLocation(user) ? null : (user?.locationId ?? null)),
  );
  const { t } = useTranslation();
  const { toast } = useToast();

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

  const currentLocation = locations?.find((l) => l.id === selectedLocationId);
  const waitingImageUrl = (currentLocation?.config as { waitingImageUrl?: string } | undefined)?.waitingImageUrl ?? null;
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLocationId || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: t("menu.uploadFailed"), description: t("menu.fileTooLarge"), variant: "destructive" });
      e.target.value = "";
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || t("menu.uploadFailed"));
      }
      const data = (await res.json()) as { url?: string };
      if (!data?.url) throw new Error(t("menu.noImageUrl"));
      await updateWaitingImage.mutateAsync({ locationId: selectedLocationId, imageUrl: data.url });
      toast({ title: t("menu.imageUploaded") });
    } catch (err: unknown) {
      toast({ title: t("menu.uploadFailed"), description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async () => {
    if (!selectedLocationId) return;
    try {
      await updateWaitingImage.mutateAsync({ locationId: selectedLocationId, imageUrl: null });
      toast({ title: t("orderNumbers.removeImage") });
    } catch (err: unknown) {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager", "waiter", "kitchen_staff"]}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t("orderNumbers.screenTitle")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("orderNumbers.screenSubtitle")}</p>
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

        {!showLocationSelector && currentLocation && (
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1.5 gap-1.5 rounded-lg"
          >
            <MapPin className="w-3.5 h-3.5" />
            {currentLocation.name}
          </Badge>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() =>
              window.open(`/order-numbers/view?locationId=${selectedLocationId}`, "_blank")
            }
            className="gap-2"
            disabled={!selectedLocationId}
          >
            <ExternalLink className="h-4 w-4" />
            {t("orderNumbers.openWindow")}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!selectedLocationId}
            onClick={() => {
              const url = `${window.location.origin}/order-numbers/view?locationId=${selectedLocationId}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: t("common.linkCopied") }));
            }}
          >
            <Copy className="h-4 w-4" />
            {t("common.copyLink")}
          </Button>
        </div>

        {selectedLocationId && (
          <div className="space-y-3 rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30 p-4 max-w-md">
            <div>
              <h3 className="font-semibold text-foreground">{t("orderNumbers.waitingImage")}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{t("orderNumbers.waitingImageDesc")}</p>
            </div>
            {waitingImageUrl ? (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border border-border/50 dark:border-white/50 aspect-video bg-black/20">
                  <img
                    src={resolveImageUrl({ imageUrl: waitingImageUrl }) ?? waitingImageUrl}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                    <Button variant="outline" className="w-full gap-2" asChild disabled={isUploading}>
                      <span>
                        <ImagePlus className="h-4 w-4" />
                        {isUploading ? "..." : t("menu.replaceImage")}
                      </span>
                    </Button>
                  </label>
                  <Button variant="outline" className="gap-2" onClick={handleRemoveImage} disabled={updateWaitingImage.isPending}>
                    <Trash2 className="h-4 w-4" />
                    {t("orderNumbers.removeImage")}
                  </Button>
                </div>
              </div>
            ) : (
              <label className="block">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                <div className="rounded-lg border border-dashed border-border/50 dark:border-white/50 aspect-video flex flex-col items-center justify-center gap-2 bg-black/10 hover:bg-black/20 transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">{isUploading ? "..." : t("orderNumbers.uploadWaitingImage")}</span>
                </div>
              </label>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
