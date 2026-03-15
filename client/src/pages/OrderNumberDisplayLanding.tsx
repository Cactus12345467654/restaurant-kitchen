import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { NumberDisplayThemeToggle } from "@/components/NumberDisplayThemeToggle";
import { ExternalLink, Copy, ImagePlus, Trash2, Monitor, Smartphone } from "lucide-react";
import { useLocationWithUrlSync } from "@/hooks/use-location-with-url-sync";
import { useUpdateWaitingImage, useUpdateScreenOrientation } from "@/hooks/use-locations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { resolveImageUrl } from "@/lib/utils";
import type { ScreenOrientation } from "@shared/schema";
import type { TranslationKey } from "@/i18n/translations/lv";

type ManualOrientation = Exclude<ScreenOrientation, "auto">;

const MANUAL_OPTIONS: {
  value: ManualOrientation;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: (cls: string) => React.ReactNode;
}[] = [
  {
    value: "horizontal",
    labelKey: "orderNumbers.orientationHorizontal",
    descKey: "orderNumbers.orientationHorizontalDesc",
    icon: (cls) => <Monitor className={cls} />,
  },
  {
    value: "vertical-left",
    labelKey: "orderNumbers.orientationVerticalLeft",
    descKey: "orderNumbers.orientationVerticalLeftDesc",
    icon: (cls) => <Smartphone className={`${cls} -rotate-90`} />,
  },
  {
    value: "vertical-right",
    labelKey: "orderNumbers.orientationVerticalRight",
    descKey: "orderNumbers.orientationVerticalRightDesc",
    icon: (cls) => <Smartphone className={`${cls} rotate-90`} />,
  },
];

function orientationLabel(orientation: ScreenOrientation, t: ReturnType<typeof import("@/i18n").useTranslation>["t"]): string {
  switch (orientation) {
    case "horizontal": return t("orderNumbers.orientationHorizontal");
    case "vertical-left": return t("orderNumbers.orientationVerticalLeft");
    case "vertical-right": return t("orderNumbers.orientationVerticalRight");
    default: return t("orderNumbers.orientationAuto");
  }
}

export default function OrderNumberDisplayLanding() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { locationId: selectedLocationId, setLocationId: setSelectedLocationId, locations, showLocationSelector } = useLocationWithUrlSync();
  const updateWaitingImage = useUpdateWaitingImage();
  const currentLocation = locations?.find((l) => l.id === selectedLocationId);
  const locationConfig = currentLocation?.config as
    | { waitingImageUrl?: string; screenOrientation?: ScreenOrientation }
    | undefined;
  const waitingImageUrl = locationConfig?.waitingImageUrl ?? null;
  const serverOrientation: ScreenOrientation = locationConfig?.screenOrientation ?? "auto";
  const [localOrientation, setLocalOrientation] = useState<ScreenOrientation>(serverOrientation);

  useEffect(() => {
    setLocalOrientation(serverOrientation);
  }, [serverOrientation]);

  const isCustomOrientation = localOrientation !== "auto";
  const [isUploading, setIsUploading] = useState(false);
  const updateScreenOrientation = useUpdateScreenOrientation();

  if (import.meta.env.DEV) {
    console.debug("[OrderNumberDisplayLanding] orientation:", {
      serverOrientation,
      localOrientation,
      locationId: selectedLocationId,
    });
  }

  const setOrientation = (value: ScreenOrientation) => {
    if (!selectedLocationId) return;
    setLocalOrientation(value);
    updateScreenOrientation.mutate(
      {
        locationId: selectedLocationId,
        screenOrientation: value,
      },
      {
        onError: () => {
          toast({ title: t("orderNumbers.saveError"), variant: "destructive" });
        },
      }
    );
  };

  const isSaving = updateScreenOrientation.isPending;
  const saveStatus =
    isSaving ? "saving" : updateScreenOrientation.isError ? "error" : updateScreenOrientation.isSuccess ? "saved" : "idle";

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
            onValueChange={(v) => setSelectedLocationId(v ? Number(v) : null)}
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

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => {
              const url = `/order-numbers/view?locationId=${selectedLocationId}&orientation=${encodeURIComponent(localOrientation)}`;
              window.open(url, "_blank");
            }}
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
              const url = `${window.location.origin}/order-numbers/view?locationId=${selectedLocationId}&orientation=${encodeURIComponent(localOrientation)}`;
              navigator.clipboard.writeText(url).then(() => toast({ title: t("common.linkCopied") }));
            }}
          >
            <Copy className="h-4 w-4" />
            {t("common.copyLink")}
          </Button>

          {selectedLocationId && (
            <Badge
              variant="secondary"
              className="text-xs px-2.5 py-1 gap-1.5 rounded-md font-normal"
            >
              {t("orderNumbers.selectedMode")}: {orientationLabel(localOrientation, t)}
            </Badge>
          )}
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

        <div className="flex items-center gap-2 rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30 p-4 max-w-md">
          <NumberDisplayThemeToggle />
          <span className="text-sm text-muted-foreground">{t("orderNumbers.themeForDisplay")}</span>
        </div>

        {selectedLocationId && (
          <div className="space-y-4 rounded-xl border border-border/50 dark:border dark:border-white/50 bg-card/30 p-4 max-w-md">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{t("orderNumbers.screenOrientation")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("orderNumbers.orientationHelp")} {t("orderNumbers.orientationSyncsAll")}</p>
              </div>
              <Switch
                checked={isCustomOrientation}
                disabled={isSaving}
                onCheckedChange={(checked) => {
                  setOrientation(checked ? "horizontal" : "auto");
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs w-fit gap-1.5 rounded-md font-normal">
                {t("orderNumbers.selectedMode")}: {orientationLabel(localOrientation, t)}
              </Badge>
              {saveStatus !== "idle" && (
                <span className={`text-xs ${saveStatus === "saving" ? "text-muted-foreground" : saveStatus === "error" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {saveStatus === "saving" && t("orderNumbers.saving")}
                  {saveStatus === "saved" && t("orderNumbers.saved")}
                  {saveStatus === "error" && t("orderNumbers.saveError")}
                </span>
              )}
            </div>

            {isCustomOrientation && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {MANUAL_OPTIONS.map((opt) => {
                    const isActive = localOrientation === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setOrientation(opt.value)}
                        disabled={isSaving}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/40 dark:border-white/20 bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/20"
                      }`}
                    >
                      {opt.icon("h-7 w-7")}
                      <span className="font-semibold leading-tight text-center">
                        {t(opt.labelKey)}
                      </span>
                      <span className={`text-[10px] leading-snug text-center ${isActive ? "text-primary/70" : "text-muted-foreground/70"}`}>
                        {t(opt.descKey)}
                      </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("orderNumbers.orientationUsedWhenOpening")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
