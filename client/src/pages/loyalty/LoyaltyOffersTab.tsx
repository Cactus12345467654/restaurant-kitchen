import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n";
import { useLocations } from "@/hooks/use-locations";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "@/components/DateTimePicker";
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ImageIcon,
  X,
  Globe,
  MapPin,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { format, isPast } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Offer {
  id: number;
  locationId: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsRequired: number;
  rewardType: string;
  rewardValue: Record<string, unknown>;
  validUntil: string;
  isActive: boolean;
  createdAt: string | null;
}

interface OfferFormData {
  title: string;
  description: string;
  pointsRequired: number;
  validUntil: string;
  imageUrl: string;
  isActive: boolean;
  rewardType: string;
  locationId: string;
}

const EMPTY_FORM: OfferFormData = {
  title: "",
  description: "",
  pointsRequired: 0,
  validUntil: "",
  imageUrl: "",
  isActive: true,
  rewardType: "other",
  locationId: "",
};

const QUERY_KEY = ["admin-loyalty-offers"];

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchOffers(): Promise<Offer[]> {
  const res = await fetch("/api/admin/loyalty/offers", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch offers");
  return res.json();
}

async function createOffer(data: OfferFormData): Promise<Offer> {
  const body = {
    title: data.title,
    description: data.description || null,
    imageUrl: data.imageUrl || null,
    pointsRequired: data.pointsRequired,
    rewardType: data.rewardType,
    validUntil: data.validUntil,
    isActive: data.isActive,
    locationId: data.locationId ? Number(data.locationId) : null,
  };
  // #region agent log
  fetch('http://127.0.0.1:7453/ingest/8a2f933e-05c0-4573-9457-60f66e1ab17f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'544d9b'},body:JSON.stringify({sessionId:'544d9b',location:'LoyaltyOffersTab.tsx:113',message:'createOffer fetch',data:{url:'/api/admin/loyalty/offers',method:'POST',body},timestamp:Date.now(),runId:'run1',hypothesisId:'H-A'})}).catch(()=>{});
  // #endregion
  const res = await fetch("/api/admin/loyalty/offers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to create offer");
  }
  return res.json();
}

async function updateOffer(id: number, data: Partial<OfferFormData> & { isActive?: boolean }): Promise<Offer> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined)         body.title = data.title;
  if (data.description !== undefined)   body.description = data.description || null;
  if (data.imageUrl !== undefined)      body.imageUrl = data.imageUrl || null;
  if (data.pointsRequired !== undefined) body.pointsRequired = data.pointsRequired;
  if (data.rewardType !== undefined)    body.rewardType = data.rewardType;
  if (data.validUntil !== undefined)    body.validUntil = data.validUntil;
  if (data.isActive !== undefined)      body.isActive = data.isActive;
  if (data.locationId !== undefined)    body.locationId = data.locationId ? Number(data.locationId) : null;
  const res = await fetch(`/api/admin/loyalty/offers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to update offer");
  }
  return res.json();
}

async function deleteOffer(id: number): Promise<void> {
  const res = await fetch(`/api/admin/loyalty/offers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete offer");
}

// ── Image upload ──────────────────────────────────────────────────────────────

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

function ImageUpload({ value, onChange }: ImageUploadProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Upload failed");
      }
      const { url } = await res.json();
      onChange(url);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">{t("loyalty.offers.fieldImage")}</Label>

      {value ? (
        <div className="relative group w-full aspect-video rounded-xl overflow-hidden border border-border/50 dark:border-white/20 bg-muted/30">
          <img src={value} alt="offer" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="text-xs h-7 gap-1"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {t("loyalty.offers.replaceImage")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="text-xs h-7 gap-1"
              onClick={() => onChange("")}
            >
              <X className="w-3 h-3" />
              {t("loyalty.offers.removeImage")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full aspect-video rounded-xl border-2 border-dashed border-border/50 dark:border-white/20 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
        >
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <ImageIcon className="w-6 h-6" />
          )}
          <span className="text-xs">{t("loyalty.offers.chooseImage")}</span>
        </button>
      )}

      {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Offer form dialog ─────────────────────────────────────────────────────────

interface OfferFormDialogProps {
  offer: Offer | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function OfferFormDialog({ offer, open, onClose, onSaved }: OfferFormDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: locations } = useLocations();
  const qc = useQueryClient();

  const isEdit = offer !== null;

  function offerToForm(o: Offer): OfferFormData {
    return {
      title: o.title,
      description: o.description ?? "",
      pointsRequired: o.pointsRequired,
      validUntil: o.validUntil
        ? o.validUntil.slice(0, 16)          // "YYYY-MM-DDTHH:MM"
        : "",
      imageUrl: o.imageUrl ?? "",
      isActive: o.isActive,
      rewardType: o.rewardType,
      locationId: o.locationId != null ? String(o.locationId) : "",
    };
  }

  const [form, setForm] = useState<OfferFormData>(() =>
    offer ? offerToForm(offer) : { ...EMPTY_FORM },
  );
  const [formError, setFormError] = useState("");

  // Sync form when the target offer changes (open for edit)
  const prevOffer = useRef<Offer | null>(null);
  if (open && offer !== prevOffer.current) {
    prevOffer.current = offer;
    setForm(offer ? offerToForm(offer) : { ...EMPTY_FORM });
    setFormError("");
  }

  const update = (patch: Partial<OfferFormData>) => setForm((f) => ({ ...f, ...patch }));

  const saveMutation = useMutation({
    mutationFn: () =>
      isEdit ? updateOffer(offer!.id, form) : createOffer(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: isEdit ? t("loyalty.offers.updated") : t("loyalty.offers.created") });
      onSaved();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!form.title.trim())  { setFormError(t("loyalty.offers.fieldTitle") + " " + t("common.required")); return; }
    if (!form.validUntil)    { setFormError(t("loyalty.offers.fieldValidUntil") + " " + t("common.required")); return; }
    saveMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("loyalty.offers.edit") : t("loyalty.offers.create")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>{t("loyalty.offers.fieldTitle")} *</Label>
              <Input
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder={t("loyalty.offers.fieldTitlePlaceholder")}
                className="bg-background/50"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>{t("loyalty.offers.fieldDesc")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={t("loyalty.offers.fieldDescPlaceholder")}
                rows={3}
                className="bg-background/50 resize-none"
              />
            </div>

            {/* Points required */}
            <div className="space-y-1.5">
              <Label>{t("loyalty.offers.fieldPoints")}</Label>
              <Input
                type="number"
                min={0}
                value={form.pointsRequired}
                onChange={(e) => update({ pointsRequired: Math.max(0, parseInt(e.target.value) || 0) })}
                className="bg-background/50"
              />
            </div>

            {/* Valid until */}
            <div className="space-y-1.5">
              <Label>{t("loyalty.offers.fieldValidUntil")} *</Label>
              <DateTimePicker
                value={form.validUntil}
                onChange={(v) => update({ validUntil: v })}
                placeholder={t("loyalty.offers.fieldValidUntil")}
              />
            </div>

            {/* Reward type */}
            <div className="space-y-1.5">
              <Label>{t("loyalty.offers.fieldRewardType")}</Label>
              <Select value={form.rewardType} onValueChange={(v) => update({ rewardType: v })}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="discount">{t("loyalty.offers.rewardDiscount")}</SelectItem>
                  <SelectItem value="free_item">{t("loyalty.offers.rewardFreeItem")}</SelectItem>
                  <SelectItem value="other">{t("loyalty.offers.rewardOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label>{t("loyalty.offers.fieldLocation")}</Label>
              <Select
                value={form.locationId || "global"}
                onValueChange={(v) => update({ locationId: v === "global" ? "" : v })}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">{t("loyalty.offers.locationGlobal")}</SelectItem>
                  {(locations ?? []).map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Image */}
            <div className="sm:col-span-2">
              <ImageUpload value={form.imageUrl} onChange={(url) => update({ imageUrl: url })} />
            </div>

            {/* Active toggle */}
            <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-border/50 dark:border-white/20 bg-muted/20 p-4">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(v) => update({ isActive: v })}
              />
              <Label htmlFor="isActive" className="cursor-pointer text-sm">
                {t("loyalty.offers.fieldActive")}
              </Label>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-destructive flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Offer card ────────────────────────────────────────────────────────────────

interface OfferCardProps {
  offer: Offer;
  locationName: string | undefined;
  onEdit: (o: Offer) => void;
  onDelete: (o: Offer) => void;
  onToggleActive: (o: Offer) => void;
  toggling: boolean;
}

function OfferCard({ offer, locationName, onEdit, onDelete, onToggleActive, toggling }: OfferCardProps) {
  const { t } = useTranslation();
  const expired = isPast(new Date(offer.validUntil));

  return (
    <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl overflow-hidden flex flex-col">
      {/* Image */}
      {offer.imageUrl ? (
        <div className="aspect-video overflow-hidden bg-muted/30 shrink-0">
          <img src={offer.imageUrl} alt={offer.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
          <Tag className="w-8 h-8 text-primary/40" />
        </div>
      )}

      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{offer.title}</h3>
          <div className="flex gap-1 shrink-0">
            {expired ? (
              <Badge variant="destructive" className="text-xs">{t("loyalty.offers.expired")}</Badge>
            ) : offer.isActive ? (
              <Badge className="text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">{t("common.active")}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">{t("common.inactive")}</Badge>
            )}
          </div>
        </div>

        {/* Description */}
        {offer.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{offer.description}</p>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground mt-auto">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-foreground">{offer.pointsRequired} {t("loyalty.offers.points")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {offer.locationId ? (
              <><MapPin className="w-3.5 h-3.5 shrink-0" /><span>{locationName ?? `#${offer.locationId}`}</span></>
            ) : (
              <><Globe className="w-3.5 h-3.5 shrink-0" /><span>{t("loyalty.offers.global")}</span></>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span>{t("loyalty.offers.validUntil")}:</span>
            <span className={expired ? "text-destructive font-medium" : ""}>
              {format(new Date(offer.validUntil), "dd.MM.yyyy HH:mm")}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-border/50 dark:border-white/10 mt-1">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => onToggleActive(offer)}
            disabled={toggling}
          >
            {toggling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : offer.isActive ? (
              <ToggleRight className="w-3.5 h-3.5" />
            ) : (
              <ToggleLeft className="w-3.5 h-3.5" />
            )}
            {offer.isActive ? t("loyalty.offers.deactivate") : t("loyalty.offers.activate")}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(offer)}
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(offer)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ── Skeleton cards ────────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-card border-border/50 dark:border-white/50 rounded-2xl overflow-hidden">
          <Skeleton className="aspect-video w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-8 w-full mt-2" />
          </div>
        </Card>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LoyaltyOffersTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: locations } = useLocations();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Offer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data: offers, isLoading, isError } = useQuery<Offer[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchOffers,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteOffer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: t("loyalty.offers.deleted") });
      setDeleteTarget(null);
    },
  });

  const handleEdit = (offer: Offer) => {
    setEditTarget(offer);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleToggleActive = async (offer: Offer) => {
    setTogglingId(offer.id);
    try {
      await updateOffer(offer.id, { isActive: !offer.isActive });
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: offer.isActive ? t("loyalty.offers.deactivate") : t("loyalty.offers.activate"),
      });
    } catch (e: unknown) {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const locationMap = new Map((locations ?? []).map((l) => [l.id, l.name]));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "..." : `${offers?.length ?? 0} ${t("loyalty.tabOffers").toLowerCase()}`}
        </p>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          {t("loyalty.offers.create")}
        </Button>
      </div>

      {/* Content */}
      {isError && (
        <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl p-12">
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <AlertCircle className="w-8 h-8 text-destructive/60" />
            <p className="text-sm font-medium">{t("common.error")}</p>
            <p className="text-xs">{t("common.tryAgain")}</p>
          </div>
        </Card>
      )}

      {!isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && <SkeletonCards />}

          {!isLoading && offers?.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <Card className="bg-card border-border/50 dark:border-white/50 rounded-2xl p-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Tag className="w-10 h-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">{t("loyalty.noOffers")}</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">{t("loyalty.noOffersDesc")}</p>
                  <Button onClick={handleCreate} className="gap-2 mt-2">
                    <Plus className="w-4 h-4" />
                    {t("loyalty.offers.create")}
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {!isLoading && (offers ?? []).map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              locationName={offer.locationId != null ? locationMap.get(offer.locationId) : undefined}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              onToggleActive={handleToggleActive}
              toggling={togglingId === offer.id}
            />
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <OfferFormDialog
        offer={editTarget}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setFormOpen(false)}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("loyalty.offers.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("loyalty.offers.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("common.delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
