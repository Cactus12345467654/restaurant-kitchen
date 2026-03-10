import { useState, useEffect, useMemo, useCallback, Fragment, useRef } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth, hasRole, canSelectLocation } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import {
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
  useMenuItemModifiers,
  useLocationModifierGroups,
  useCreateModifierGroup,
  useCreateModifierOption,
  useUpdateModifierGroup,
  useUpdateModifierOption,
  useDeleteModifierGroup,
  useDeleteModifierOption,
  useAttachModifierGroupToItem,
  useDetachModifierGroupFromItem,
} from "@/hooks/use-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Loader2, AlertCircle, X, ChevronDown, ChevronRight, MoreVertical, GripVertical, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";
import { resolveImageUrl } from "@/lib/utils";

function ModifierOptionForm({
  groupId,
  menuItemId,
  onCancel,
}: {
  groupId: number;
  menuItemId: number;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [priceDeltaStr, setPriceDeltaStr] = useState("0");
  const createOptionMutation = useCreateModifierOption(menuItemId);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const priceDelta = Math.round(parseFloat(priceDeltaStr) * 100);
    if (isNaN(priceDelta)) return;

    try {
      await createOptionMutation.mutateAsync({
        name,
        priceDelta,
        modifierGroupId: groupId,
      });
      onCancel();
      toast({ title: t("modifiers.optionAdded") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-3 bg-black/40 rounded-lg border border-border/30 space-y-3 animate-in fade-in zoom-in-95 duration-200"
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("modifiers.optionName")}
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("modifiers.optionNamePlaceholder")}
            autoFocus
            className="h-8 text-xs bg-black/20 border-border/50"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("modifiers.extraPrice")}
          </Label>
          <Input
            type="number"
            step="0.01"
            value={priceDeltaStr}
            onChange={(e) => setPriceDeltaStr(e.target.value)}
            className="h-8 text-xs bg-black/20 border-border/50"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 text-[10px] px-2"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={createOptionMutation.isPending || !name.trim()}
          className="h-7 text-[10px] px-2"
        >
          {createOptionMutation.isPending && (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          )}
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function ManageModifiersModal({
  isOpen,
  onClose,
  itemName,
  menuItemId,
  locationId,
}: {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  menuItemId: number | null;
  locationId: number | null;
}) {
  const queryClient = useQueryClient();
  const {
    data: modifierGroups,
    isLoading,
    refetch,
  } = useMenuItemModifiers(menuItemId);
  const { data: locationGroups = [] } = useLocationModifierGroups(locationId);
  const createGroupMutation = useCreateModifierGroup(menuItemId);
  const attachGroupMutation = useAttachModifierGroupToItem(menuItemId);
  const detachGroupMutation = useDetachModifierGroupFromItem(menuItemId);
  const updateGroupMutation = useUpdateModifierGroup(menuItemId);
  const deleteGroupMutation = useDeleteModifierGroup(menuItemId);
  const updateOptionMutation = useUpdateModifierOption(menuItemId);
  const deleteOptionMutation = useDeleteModifierOption(menuItemId);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingOptionGroupId, setAddingOptionGroupId] = useState<number | null>(
    null,
  );
  const [editingOptionId, setEditingOptionId] = useState<number | null>(null);
  const [editOptionName, setEditOptionName] = useState("");
  const [editOptionPriceStr, setEditOptionPriceStr] = useState("");
  const [draggedOptionId, setDraggedOptionId] = useState<number | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const sortedGroups = useMemo(
    () =>
      [...(modifierGroups || [])].sort(
        (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [modifierGroups]
  );

  const isOptionActive = (o: any) => o?.isActive ?? o?.is_active ?? true;

  // Refetch when modal opens to ensure fresh data
  useEffect(() => {
    if (isOpen && menuItemId) {
      refetch();
    }
  }, [isOpen, menuItemId, refetch]);

  // Clear edit state when modal closes so editing is never stuck across sessions
  useEffect(() => {
    if (!isOpen) {
      setEditingOptionId(null);
      setDraggedOptionId(null);
    }
  }, [isOpen]);

  const handleOptionReorder = async (group: any, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const options = [...(group.options || [])].sort(
      (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    const [removed] = options.splice(fromIndex, 1);
    options.splice(toIndex, 0, removed);
    try {
      await Promise.all(
        options.map((opt: any, i: number) =>
          updateOptionMutation.mutateAsync({ id: opt.id, sortOrder: i })
        )
      );
      await refetch();
      toast({ title: t("modifiers.orderSaved") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !locationId) return;

    try {
      await createGroupMutation.mutateAsync({
        name: newGroupName.trim(),
        locationId,
        ...(menuItemId != null ? { menuItemId } : {}),
      });
      setNewGroupName("");
      setIsAddingGroup(false);
      await refetch();
      toast({ title: t("modifiers.groupCreated") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const attachedGroupIds = useMemo(() => new Set((modifierGroups ?? []).map((g: any) => g.id)), [modifierGroups]);
  const availableToAttach = useMemo(
    () => locationGroups.filter((g: any) => !attachedGroupIds.has(g.id)),
    [locationGroups, attachedGroupIds]
  );

  const handleRemoveGroupFromItem = async (id: number) => {
    if (!confirm(t("modifiers.confirmDetach"))) return;
    try {
      await detachGroupMutation.mutateAsync(id);
      await refetch();
      toast({ title: t("modifiers.groupDetached") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm(t("modifiers.confirmDelete"))) return;
    try {
      await deleteGroupMutation.mutateAsync(id);
      await refetch();
      toast({ title: t("modifiers.groupDeleted") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteOption = async (id: number) => {
    if (!confirm(t("modifiers.confirmDeleteOption"))) return;
    try {
      await deleteOptionMutation.mutateAsync(id);
      await refetch();
      setEditingOptionId((current) => (current === id ? null : current));
      toast({ title: t("modifiers.optionDeleted") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const startEditingOption = (option: any) => {
    setEditingOptionId(option.id);
    setEditOptionName(option.name);
    setEditOptionPriceStr(((option.priceDelta ?? 0) / 100).toFixed(2));
  };

  const cancelOptionEdit = () => {
    setEditingOptionId(null);
  };

  const handleSaveOptionEdit = async (optionId: number) => {
    const name = editOptionName.trim();
    if (!name) {
      toast({ title: t("modifiers.nameRequired"), variant: "destructive" });
      return;
    }
    const priceDelta = Math.round(parseFloat(editOptionPriceStr || "0") * 100);
    if (isNaN(priceDelta)) {
      toast({ title: t("modifiers.invalidPrice"), variant: "destructive" });
      return;
    }
    try {
      await updateOptionMutation.mutateAsync({ id: optionId, name, priceDelta });
      await refetch();
      setEditingOptionId(null);
      toast({ title: t("modifiers.optionUpdated") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setEditingOptionId(null);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl w-[95vw] bg-card border-border/50 rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center pr-6">
            <DialogTitle className="font-display text-xl text-foreground">
              {t("modifiers.manageTitle")}
            </DialogTitle>
            <Button
              size="sm"
              onClick={() => setIsAddingGroup(true)}
              className="rounded-lg h-8 text-xs shadow-lg shadow-primary/20"
            >
              <Plus className="w-3 h-3 mr-1" /> {t("modifiers.addGroup")}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
          <div className="sticky top-0 bg-card pb-2 border-b border-border/50 z-10">
            <p className="font-medium text-foreground">{itemName}</p>
          </div>

          {isAddingGroup && (
            <Card className="bg-primary/5 border-primary/20 animate-in slide-in-from-top-2 duration-200 min-h-[280px]">
              <CardContent className="p-5 sm:p-6 space-y-5">
                <form onSubmit={handleCreateGroup} className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">{t("modifiers.createNewGroup")}</Label>
                  <div className="flex gap-3">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder={t("modifiers.groupNamePlaceholder")}
                      autoFocus
                      className="bg-black/20 border-border/50 h-10 text-sm rounded-lg flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        createGroupMutation.isPending || !newGroupName.trim()
                      }
                      className="h-10 px-4 text-sm rounded-lg shrink-0"
                    >
                      {createGroupMutation.isPending && (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      )}
                      {t("common.save")}
                    </Button>
                  </div>
                </form>

                {locationGroups.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/50">
                    <Label className="text-sm font-medium text-foreground">{t("modifiers.existingGroups")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("modifiers.existingGroupsHint")}
                    </p>
                    <ul className="space-y-2 max-h-48 overflow-y-auto rounded-lg bg-black/20 p-3 border border-border/30">
                      {locationGroups.map((g: any) => {
                        const isAttached = attachedGroupIds.has(g.id);
                        return (
                          <li
                            key={g.id}
                            className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover:bg-white/5 text-sm"
                          >
                            <span className="font-medium text-foreground truncate">{g.name}</span>
                            {isAttached ? (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {t("modifiers.added")}
                              </Badge>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 text-sm shrink-0"
                                disabled={attachGroupMutation.isPending}
                                onClick={async () => {
                                  try {
                                    await attachGroupMutation.mutateAsync({ modifierGroupId: g.id });
                                    await refetch();
                                    toast({ title: t("modifiers.groupAttached") });
                                  } catch (err: any) {
                                    toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                                  }
                                }}
                              >
                                {t("modifiers.attach")}
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingGroup(false);
                      setNewGroupName("");
                    }}
                    className="h-9 text-sm rounded-lg px-4"
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">{t("modifiers.loadingModifiers")}</p>
            </div>
          ) : !sortedGroups.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm italic">
                {t("modifiers.noModifiers")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedGroups.map((group: any, groupIndex: number) => {
                const sortedOptions = [...(group.options || [])].sort(
                  (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                );
                return (
                  <Card
                    key={group.id}
                    className="bg-black/20 border-border/50 hover:border-border transition-colors group"
                  >
                    <CardContent className="p-4 relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                            title={t("modifiers.groupActions")}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem
                            onClick={() => handleRemoveGroupFromItem(group.id)}
                            className="text-foreground"
                          >
                            {t("modifiers.detachFromItem")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            {t("modifiers.deleteCompletely")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <div className="flex justify-between items-start mb-3 mr-8">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h5 className="font-bold text-foreground truncate">
                            {group.name}
                          </h5>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAddingOptionGroupId(group.id)}
                          className="h-7 text-[10px] px-2 border border-border/30 hover:bg-primary/10 shrink-0"
                        >
                          <Plus className="w-3 h-3 mr-1" /> {t("modifiers.addOption")}
                        </Button>
                      </div>

                      {(() => {
                        const isReq = group.isRequired ?? group.is_required ?? false;
                        const toggleRequired = async () => {
                          if (updateGroupMutation.isPending) return;
                          const newVal = !isReq;
                          queryClient.setQueryData(
                            ["menu-item-modifiers", menuItemId],
                            (old: any[] | undefined) => {
                              if (!old) return old;
                              return old.map((g: any) =>
                                g.id === group.id
                                  ? { ...g, isRequired: newVal, is_required: newVal }
                                  : g
                              );
                            }
                          );
                          try {
                            await updateGroupMutation.mutateAsync({ id: group.id, isRequired: newVal });
                            toast({ title: newVal ? t("modifiers.groupRequired") : t("modifiers.groupNotRequired") });
                          } catch (err: any) {
                            queryClient.setQueryData(
                              ["menu-item-modifiers", menuItemId],
                              (old: any[] | undefined) => {
                                if (!old) return old;
                                return old.map((g: any) =>
                                  g.id === group.id
                                    ? { ...g, isRequired: isReq, is_required: isReq }
                                    : g
                                );
                              }
                            );
                            toast({ title: t("common.error"), description: err.message, variant: "destructive" });
                          }
                        };
                        return (
                          <div
                            className="flex items-center gap-2 mb-3 cursor-pointer select-none"
                            onClick={(e) => { e.stopPropagation(); toggleRequired(); }}
                          >
                            <span
                              role="checkbox"
                              aria-checked={isReq}
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); toggleRequired(); }}
                              onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                  e.preventDefault();
                                  toggleRequired();
                                }
                              }}
                              className="h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 flex items-center justify-center"
                              data-state={isReq ? "checked" : "unchecked"}
                              style={isReq ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } : {}}
                            >
                              {isReq ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {updateGroupMutation.isPending ? t("modifiers.saving") : isReq ? t("modifiers.requiredLabel") : t("modifiers.notRequiredLabel")}
                            </span>
                          </div>
                        );
                      })()}

                      <div className="space-y-1.5">
                        {sortedOptions.map((option: any, optionIndex: number) =>
                          editingOptionId === option.id ? (
                            <div
                              key={option.id}
                              className="mt-3 p-3 bg-black/40 rounded-lg border border-border/30 space-y-3 animate-in fade-in zoom-in-95 duration-200"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {t("modifiers.optionName")}
                                  </Label>
                                  <Input
                                    value={editOptionName}
                                    onChange={(e) => setEditOptionName(e.target.value)}
                                    placeholder={t("modifiers.optionNamePlaceholder")}
                                    className="h-8 text-xs bg-black/20 border-border/50"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {t("modifiers.extraPrice")}
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editOptionPriceStr}
                                    onChange={(e) => setEditOptionPriceStr(e.target.value)}
                                    className="h-8 text-xs bg-black/20 border-border/50"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteOption(option.id)}
                                  disabled={deleteOptionMutation.isPending}
                                  className="h-7 text-[10px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  {deleteOptionMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3 mr-1" />
                                  )}
                                  {t("common.delete")}
                                </Button>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelOptionEdit}
                                    className="h-7 text-[10px] px-2"
                                  >
                                    {t("common.cancel")}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleSaveOptionEdit(option.id)}
                                    disabled={
                                      updateOptionMutation.isPending ||
                                      !editOptionName.trim()
                                    }
                                    className="h-7 text-[10px] px-2"
                                  >
                                    {updateOptionMutation.isPending ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : null}
                                    {t("common.save")}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div
                              key={option.id}
                              className={`text-sm text-muted-foreground flex justify-between items-center gap-2 py-1.5 border-b border-border/5 last:border-0 group/option ${draggedOptionId === option.id ? "opacity-50" : ""}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.add("ring-1", "ring-primary/30");
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove("ring-1", "ring-primary/30");
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove("ring-1", "ring-primary/30");
                                const fromIndex = parseInt(e.dataTransfer.getData("text/plain") || "", 10);
                                if (isNaN(fromIndex)) return;
                                setDraggedOptionId(null);
                                handleOptionReorder(group, fromIndex, optionIndex);
                              }}
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className={`truncate ${!isOptionActive(option) ? "opacity-60 line-through" : ""}`}>
                                  {option.name}
                                </span>
                                {option.priceDelta > 0 && (
                                  <span className="text-xs font-medium text-emerald-500 shrink-0">
                                    (+${(option.priceDelta / 100).toFixed(2)})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isOptionActive(option)}
                                  disabled={updateOptionMutation.isPending}
                                  title={!isOptionActive(option) ? t("modifiers.unavailable") : t("modifiers.available")}
                                  className="h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 flex items-center justify-center data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                                  data-state={isOptionActive(option) ? "checked" : "unchecked"}
                                  style={isOptionActive(option) ? { backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } : {}}
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const value = !isOptionActive(option);
                                    const prev = isOptionActive(option);
                                    queryClient.setQueryData(
                                      ["menu-item-modifiers", menuItemId],
                                      (old: any[] | undefined) => {
                                        if (!old) return old;
                                        return old.map((g: any) => ({
                                          ...g,
                                          options: (g.options || []).map((o: any) =>
                                            o.id === option.id ? { ...o, isActive: value, is_active: value } : o
                                          ),
                                        }));
                                      }
                                    );
                                    try {
                                      await updateOptionMutation.mutateAsync({ id: option.id, isActive: value });
                                      toast({ title: value ? t("modifiers.optionAvailable") : t("modifiers.optionHidden") });
                                    } catch (err: any) {
                                      queryClient.setQueryData(
                                        ["menu-item-modifiers", menuItemId],
                                        (old: any[] | undefined) => {
                                          if (!old) return old;
                                          return old.map((g: any) => ({
                                            ...g,
                                            options: (g.options || []).map((o: any) =>
                                              o.id === option.id ? { ...o, isActive: prev, is_active: prev } : o
                                            ),
                                          }));
                                        }
                                      );
                                      toast({ title: t("common.error"), description: (err as Error)?.message ?? t("common.error"), variant: "destructive" });
                                    }
                                  }}
                                >
                                  {isOptionActive(option) ? <Check className="h-3 w-3" /> : null}
                                </button>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => startEditingOption(option)}
                                  className="h-5 w-5 text-muted-foreground hover:text-primary transition-all"
                                  title={t("modifiers.editOption")}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteOption(option.id)}
                                  className="h-5 w-5 opacity-0 group/option-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                  title={t("modifiers.deleteOption")}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                <span
                                  draggable
                                  onDragStart={(e) => {
                                    setDraggedOptionId(option.id);
                                    e.dataTransfer.setData("text/plain", String(optionIndex));
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragEnd={() => setDraggedOptionId(null)}
                                  className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/10"
                                  title={t("modifiers.dragToReorder")}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </span>
                              </div>
                            </div>
                          )
                        )}
                        {sortedOptions.length === 0 && !addingOptionGroupId && (
                          <p className="text-xs text-muted-foreground italic">
                            {t("modifiers.noOptions")}
                          </p>
                        )}
                      </div>


                      {addingOptionGroupId === group.id && menuItemId && (
                        <ModifierOptionForm
                          groupId={group.id}
                          menuItemId={menuItemId}
                          onCancel={() => setAddingOptionGroupId(null)}
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
        <div className="pt-4 flex justify-end border-t border-border/50 mt-4">
          <Button onClick={onClose} className="rounded-xl">
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MenuItemPreviewModal({
  isOpen,
  onClose,
  itemName,
  imageUrl,
  groups: rawGroups,
}: {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  imageUrl?: string | null;
  groups: any[];
}) {
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const { t } = useTranslation();

  const sortedGroups = useMemo(
    () =>
      [...(rawGroups || [])].sort(
        (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      ),
    [rawGroups]
  );

  const visibleGroups = useMemo(() => {
    return sortedGroups.filter((group: any) => {
      const hasCondition =
        group.dependsOnGroupId != null || group.dependsOnOptionId != null;
      if (!hasCondition) return true;
      if (group.dependsOnGroupId == null || group.dependsOnOptionId == null)
        return true;
      return selectedOptions[group.dependsOnGroupId] === group.dependsOnOptionId;
    });
  }, [sortedGroups, selectedOptions]);

  const handleSelectOption = (groupId: number, optionId: number) => {
    const currentSortOrder =
      sortedGroups.find((g: any) => g.id === groupId)?.sortOrder ?? 0;
    setSelectedOptions((prev) => {
      const next = { ...prev, [groupId]: optionId };
      sortedGroups.forEach((g: any) => {
        if ((g.sortOrder ?? 0) > currentSortOrder) delete next[g.id];
      });
      return next;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            {t("preview.title")}
          </DialogTitle>
          <div className="mt-2 space-y-2">
            {resolveImageUrl({ imageUrl }) ? (
              <img
                src={resolveImageUrl({ imageUrl })!}
                alt=""
                className="w-full max-w-[200px] h-[150px] object-cover rounded-xl border border-border/50 bg-black/20"
              />
            ) : (
              <div className="w-full max-w-[200px] h-[150px] rounded-xl border border-border/50 bg-white/5 flex items-center justify-center">
                <span className="text-muted-foreground text-lg">—</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{itemName}</p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-2 space-y-6">
          {sortedGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4">
              {t("preview.noGroups")}
            </p>
          ) : (
            visibleGroups.map((group: any, stepIndex: number) => {
              const options = [...(group.options || [])].sort(
                (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
              );
              const selectedId = selectedOptions[group.id];
              return (
                <div
                  key={group.id}
                  className="space-y-2 pb-4 border-b border-border/30 last:border-0"
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("preview.step")} {stepIndex + 1}
                  </h4>
                  <p className="font-semibold text-foreground">{group.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option: any) => (
                      <Button
                        key={option.id}
                        type="button"
                        variant={selectedId === option.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSelectOption(group.id, option.id)}
                        className={
                          selectedId === option.id
                            ? "rounded-lg border-primary bg-primary/90 text-primary-foreground"
                            : "rounded-lg border-border/50 bg-black/20 hover:bg-white/10 text-foreground"
                        }
                      >
                        {option.name}
                        {option.priceDelta > 0 && (
                          <span className="ml-1.5 text-xs opacity-90">
                            +${(option.priceDelta / 100).toFixed(2)}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-4 flex justify-end border-t border-border/50 mt-4">
          <Button onClick={onClose} variant="ghost" className="rounded-xl">
            {t("common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Menu() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Super Admin and Manager can select location; others use their assigned location.
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    canSelectLocation(user) ? null : (user?.locationId ?? null),
  );

  const queryClient = useQueryClient();
  const { data: locations } = useLocations();
  const { data: menuItems, isLoading, isError, refetch } = useMenuItems(selectedLocationId);

  // Auto-select first location for super_admin/manager so menu loads immediately
  useEffect(() => {
    if (canSelectLocation(user) && locations?.length && selectedLocationId == null) {
      setSelectedLocationId(locations[0].id);
    }
  }, [user, locations, selectedLocationId]);

  const createMutation = useCreateMenuItem(selectedLocationId);
  const updateMutation = useUpdateMenuItem(selectedLocationId);
  const deleteMutation = useDeleteMenuItem(selectedLocationId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: modifierGroups, isLoading: isLoadingModifiers, refetch: refetchModifiers } =
    useMenuItemModifiers(isDialogOpen ? editingId : null);
  const [formData, setFormData] = useState({
    name: "",
    priceStr: "",
    category: "",
    isAvailable: true,
    imageUrl: "",
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newCategoriesAdded, setNewCategoriesAdded] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editCategoryName, setEditCategoryName] = useState<string | null>(null);
  const [editCategoryNewName, setEditCategoryNewName] = useState("");

  const existingCategories = useMemo(
    () =>
      [...new Set((menuItems ?? []).map((i: { category: string }) => i.category).filter(Boolean))].sort() as string[],
    [menuItems]
  );
  const categoriesForDropdown = useMemo(
    () => [...new Set([...existingCategories, ...newCategoriesAdded])].sort(),
    [existingCategories, newCategoriesAdded]
  );

  const catOrderKey = selectedLocationId ? `cat-order-${selectedLocationId}` : null;
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    if (!catOrderKey) return [];
    try { return JSON.parse(localStorage.getItem(catOrderKey) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    if (catOrderKey) {
      try { setCategoryOrder(JSON.parse(localStorage.getItem(catOrderKey) || "[]")); } catch { setCategoryOrder([]); }
    }
  }, [catOrderKey]);

  const saveCategoryOrder = useCallback((order: string[]) => {
    setCategoryOrder(order);
    if (catOrderKey) localStorage.setItem(catOrderKey, JSON.stringify(order));
  }, [catOrderKey]);

  const menuItemsByCategory = useMemo(() => {
    const map = new Map<string, any[]>();
    [...new Set([...categoriesForDropdown, "Uncategorized"])].forEach((cat) => map.set(cat, []));
    (menuItems ?? []).forEach((item: any) => {
      const cat = item.category?.trim() || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });
    for (const [, items] of map) {
      items.sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    }
    const entries = Array.from(map.entries());
    if (categoryOrder.length > 0) {
      const orderMap = new Map(categoryOrder.map((c, i) => [c, i]));
      entries.sort(([a], [b]) => {
        const ia = orderMap.get(a) ?? 9999;
        const ib = orderMap.get(b) ?? 9999;
        return ia !== ib ? ia - ib : a.localeCompare(b);
      });
    } else {
      entries.sort(([a], [b]) => a.localeCompare(b));
    }
    return entries;
  }, [menuItems, categoriesForDropdown, categoryOrder]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const hasExpandedInitial = useRef(false);

  useEffect(() => {
    if (isDialogOpen && editingId) refetchModifiers();
  }, [isDialogOpen, editingId, refetchModifiers]);

  useEffect(() => {
    if (menuItemsByCategory.length > 0 && !hasExpandedInitial.current) {
      setExpandedCategories(new Set(menuItemsByCategory.map(([c]) => c)));
      hasExpandedInitial.current = true;
    }
  }, [menuItemsByCategory]);

  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragCategory, setDragCategory] = useState<string | null>(null);

  const handleItemReorder = useCallback(async (category: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || !selectedLocationId) return;
    const catItems = menuItemsByCategory.find(([c]) => c === category)?.[1];
    if (!catItems) return;
    const reordered = [...catItems];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updates = reordered.map((item: any, i: number) => ({ id: item.id, sortOrder: i }));
    queryClient.setQueryData(
      ["menu-items", selectedLocationId],
      (old: any[] | undefined) => {
        if (!old) return old;
        const orderMap = new Map(updates.map((u: any) => [u.id, u.sortOrder]));
        return old.map((item: any) => orderMap.has(item.id) ? { ...item, sortOrder: orderMap.get(item.id) } : item);
      }
    );
    try {
      await fetch(`/api/locations/${selectedLocationId}/menu-items/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
    } catch (_) {}
  }, [menuItemsByCategory, selectedLocationId, queryClient]);

  const [draggedCat, setDraggedCat] = useState<string | null>(null);

  const handleCategoryReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const cats = menuItemsByCategory.map(([c]) => c);
    const reordered = [...cats];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    saveCategoryOrder(reordered);
  }, [menuItemsByCategory, saveCategoryOrder]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "", priceStr: "", category: "", isAvailable: true, imageUrl: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      priceStr: (item.price / 100).toFixed(2),
      category: item.category,
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl ?? "",
    });
    setIsDialogOpen(true);
    queryClient.invalidateQueries({ queryKey: ["menu-item-modifiers", item.id] });
  };

  const MAX_IMAGE_MB = 5;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast({
        title: t("menu.uploadFailed"),
        description: t("menu.fileTooLarge"),
        variant: "destructive",
      });
      e.target.value = "";
      return;
    }
    setIsUploadingImage(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
        credentials: "include",
        redirect: "manual",
      });
      if (res.type === "opaqueredirect" || res.redirected || res.status === 302 || res.status === 301) {
        throw new Error(t("menu.sessionExpired"));
      }
      const contentType = res.headers.get("Content-Type") || "";
      const isJson = contentType.includes("application/json");
      if (res.status === 401) {
        throw new Error(t("menu.unauthorized"));
      }
      if (!res.ok) {
        let message = t("menu.uploadFailed");
        if (isJson) {
          try {
            const err = (await res.json()) as { message?: string };
            message = err?.message || message;
          } catch (_) {}
        } else {
          message = t("menu.fileTooLarge");
        }
        throw new Error(message);
      }
      let data: { url?: string };
      try {
        const text = await res.text();
        if (!text || text.trim().length === 0) {
          throw new Error(t("menu.emptyResponse"));
        }
        if (contentType.includes("application/json") || (text.startsWith("{") && text.trim().endsWith("}"))) {
          data = JSON.parse(text) as { url: string };
        } else {
          throw new Error(t("menu.badResponse"));
        }
      } catch (parseErr: any) {
        if (parseErr?.message && parseErr.message !== t("menu.badResponse")) {
          throw parseErr;
        }
        throw new Error(t("menu.badResponse"));
      }
      if (!data?.url) {
        throw new Error(t("menu.noImageUrl"));
      }
      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      toast({ title: t("menu.imageUploaded") });
    } catch (err: any) {
      toast({ title: t("menu.uploadFailed"), description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("menu.deleteConfirm"))) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: t("menu.itemDeleted") });
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!selectedLocationId || !newName.trim() || newName.trim() === oldName) return;
    try {
      const res = await fetch(`/api/locations/${selectedLocationId}/categories/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName, newName: newName.trim() }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      await queryClient.invalidateQueries({ queryKey: ["menu-items", selectedLocationId] });
      setEditCategoryName(null);
      setEditCategoryNewName("");
      toast({ title: t("menu.categoryRenamed") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    if (!selectedLocationId) return;
    if (!confirm(`Pārvietot visas pozīcijas no "${categoryName}" uz "Uncategorized"?`)) return;
    try {
      const res = await fetch(`/api/locations/${selectedLocationId}/categories/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryName }),
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json())?.message || "Failed");
      await queryClient.invalidateQueries({ queryKey: ["menu-items", selectedLocationId] });
      toast({ title: t("menu.categoryRemoved") });
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) return;
    if (!formData.category.trim()) {
      toast({ title: t("menu.categoryRequired"), variant: "destructive" });
      return;
    }

    const priceCents = Math.round(parseFloat(formData.priceStr) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      toast({ title: t("menu.invalidPrice"), variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name,
      price: priceCents,
      category: formData.category.trim(),
      isAvailable: formData.isAvailable,
      locationId: selectedLocationId,
      imageUrl: formData.imageUrl || null,
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: t("menu.itemUpdated") });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: t("menu.itemCreated") });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["super_admin", "location_admin", "manager"]}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {t("menu.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("menu.subtitle")}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {canSelectLocation(user) && (
              <Select
                value={selectedLocationId?.toString() || ""}
                onValueChange={(val) => setSelectedLocationId(parseInt(val))}
              >
                <SelectTrigger className="w-[200px] h-11 bg-card border-border/50 rounded-xl">
                  <SelectValue placeholder={t("menu.selectLocation")} />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Popover open={addCategoryOpen} onOpenChange={(open) => { setAddCategoryOpen(open); if (!open) setNewCategoryInput(""); }}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedLocationId}
                  className="rounded-xl h-11 shrink-0 whitespace-nowrap"
                >
                  {t("menu.addCategory")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <div className="space-y-2">
                  <Input
                    placeholder={t("menu.newCategoryPlaceholder")}
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = newCategoryInput.trim();
                        if (v && !categoriesForDropdown.includes(v)) {
                          setNewCategoriesAdded((prev) => [...prev, v]);
                          setNewCategoryInput("");
                          setAddCategoryOpen(false);
                          toast({ title: t("menu.categoryAdded") });
                        }
                      }
                    }}
                    className="h-9"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const v = newCategoryInput.trim();
                      if (v && !categoriesForDropdown.includes(v)) {
                        setNewCategoriesAdded((prev) => [...prev, v]);
                        setNewCategoryInput("");
                        setAddCategoryOpen(false);
                        toast({ title: t("menu.categoryAdded") });
                      }
                    }}
                  >
                    {t("common.add")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button
              onClick={openCreate}
              disabled={!selectedLocationId}
              className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> {t("menu.addItem")}
            </Button>
          </div>
        </div>

        {!selectedLocationId ? (
          <Card className="p-12 border-border/50 bg-card rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-display font-semibold">
              {t("menu.noLocation")}
            </h3>
            <p className="text-muted-foreground mt-2">
              {t("menu.noLocationDesc")}
            </p>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card rounded-2xl overflow-hidden shadow-lg shadow-black/5">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-muted-foreground">
                      {t("menu.itemName")}
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                      {t("menu.category")}
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                      {t("menu.price")}
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">
                      {t("common.status")}
                    </TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground">
                      {t("common.actions")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && menuItems == null && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        {isError ? (
                          <span>
                            {t("menu.loadError")}{" "}
                            <Button variant="link" className="p-0 h-auto" onClick={() => refetch()}>
                              {t("common.tryAgain")}
                            </Button>
                          </span>
                        ) : (
                          t("common.loading")
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && menuItems?.length === 0 && menuItems != null && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-32 text-center text-muted-foreground"
                      >
                        {t("menu.noItems")}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    menuItems != null &&
                    menuItems.length > 0 &&
                    menuItemsByCategory.map(([category, items], catIdx) => (
                      <Fragment key={category}>
                        <TableRow
                          className={`bg-white/5 border-border/50 hover:bg-white/10 cursor-pointer ${draggedCat === category ? "opacity-50" : ""}`}
                          onClick={() => toggleCategory(category)}
                          onDragOver={(e) => {
                            if (!draggedCat || draggedCat === category) return;
                            e.preventDefault();
                            e.currentTarget.classList.add("ring-1", "ring-primary/40");
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove("ring-1", "ring-primary/40");
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.classList.remove("ring-1", "ring-primary/40");
                            const fromIdx = parseInt(e.dataTransfer.getData("text/cat-index") || "", 10);
                            if (isNaN(fromIdx)) return;
                            setDraggedCat(null);
                            handleCategoryReorder(fromIdx, catIdx);
                          }}
                        >
                          <TableCell colSpan={5} className="py-2">
                            <div className="flex items-center gap-2">
                              <span
                                draggable
                                className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/cat-index", String(catIdx));
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggedCat(category);
                                }}
                                onDragEnd={() => setDraggedCat(null)}
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <span className="shrink-0 w-8 flex justify-center">
                                {expandedCategories.has(category) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                              <span className="font-semibold text-foreground">{category}</span>
                              <span className="text-muted-foreground text-sm">({items.length})</span>
                              <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditCategoryName(category);
                                    setEditCategoryNewName(category);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive disabled:opacity-50 disabled:pointer-events-none"
                                  onClick={() => handleDeleteCategory(category)}
                                  disabled={category === "Uncategorized"}
                                  title={category === "Uncategorized" ? t("menu.cannotDeleteDefault") : t("menu.deleteCategory")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedCategories.has(category) &&
                          items.map((item: any, itemIndex: number) => (
                            <TableRow
                              key={item.id}
                              className={`border-border/50 hover:bg-white/5 transition-colors ${draggedItemId === item.id ? "opacity-50" : ""}`}
                              onDragOver={(e) => {
                                if (dragCategory !== category) return;
                                e.preventDefault();
                                e.currentTarget.classList.add("ring-1", "ring-primary/30");
                              }}
                              onDragLeave={(e) => {
                                e.currentTarget.classList.remove("ring-1", "ring-primary/30");
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove("ring-1", "ring-primary/30");
                                if (dragCategory !== category) return;
                                const fromIndex = parseInt(e.dataTransfer.getData("text/plain") || "", 10);
                                if (isNaN(fromIndex)) return;
                                setDraggedItemId(null);
                                setDragCategory(null);
                                handleItemReorder(category, fromIndex, itemIndex);
                              }}
                            >
                              <TableCell className="font-medium text-foreground pl-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    draggable
                                    onDragStart={(e) => {
                                      setDraggedItemId(item.id);
                                      setDragCategory(category);
                                      e.dataTransfer.setData("text/plain", String(itemIndex));
                                      e.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragEnd={() => { setDraggedItemId(null); setDragCategory(null); }}
                                    className="cursor-grab active:cursor-grabbing touch-none p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/10 shrink-0"
                                    title={t("menu.dragToReorder")}
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </span>
                                  {resolveImageUrl(item) ? (
                                    <img
                                      src={resolveImageUrl(item)!}
                                      alt=""
                                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md border border-border/50 bg-black/20 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md border border-border/50 bg-white/5 shrink-0 flex items-center justify-center">
                                      <span className="text-muted-foreground text-lg">—</span>
                                    </div>
                                  )}
                                  <span>{item.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                <Badge variant="outline" className="rounded-md border-border/50 text-xs">
                                  {item.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                ${(item.price / 100).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`rounded-md ${item.isAvailable ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}
                                >
                                  {item.isAvailable ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEdit(item)}
                                  className="hover:bg-primary/20 hover:text-primary transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(item.id)}
                                  className="hover:bg-destructive/20 hover:text-destructive transition-colors ml-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </Fragment>
                    ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        <Dialog open={editCategoryName !== null} onOpenChange={(open) => !open && (setEditCategoryName(null), setEditCategoryNewName(""))}>
          <DialogContent className="sm:max-w-sm bg-card border-border/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{t("menu.editCategory")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Label>{t("menu.categoryName")}</Label>
              <Input
                value={editCategoryNewName}
                onChange={(e) => setEditCategoryNewName(e.target.value)}
                placeholder={t("menu.categoryNamePlaceholder")}
                className="h-11 rounded-xl bg-black/20 border-border/50"
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => (setEditCategoryName(null), setEditCategoryNewName(""))}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  onClick={() => editCategoryName && handleRenameCategory(editCategoryName, editCategoryNewName)}
                  disabled={!editCategoryNewName.trim()}
                >
                  {t("common.save")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingId ? t("menu.editItem") : t("menu.addMenuItem")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("menu.itemNameLabel")}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder={t("menu.itemNamePlaceholder")}
                  required
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>{t("menu.itemImage")}</Label>
                <div className="flex flex-col gap-3">
                  {resolveImageUrl(formData) ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={resolveImageUrl(formData)!}
                        alt="Item"
                        className="w-24 h-24 object-cover rounded-lg border border-border/50 bg-black/20"
                      />
                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center justify-center rounded-lg h-8 px-3 text-xs border border-border/50 bg-black/20 hover:bg-white/5 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={isUploadingImage}
                          />
                          {isUploadingImage ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : null}
                          {t("menu.replaceImage")}
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setFormData((prev) => ({ ...prev, imageUrl: "" }))
                          }
                        >
                          {t("menu.removeImage")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                      />
                      <div className="border border-dashed border-border/50 rounded-xl h-24 flex flex-col items-center justify-center gap-0.5 bg-black/20 hover:bg-black/30 transition-colors text-muted-foreground text-sm">
                        {isUploadingImage ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          <>
                            <span>{t("menu.chooseImage")}</span>
                            <span className="text-xs opacity-80">{t("menu.maxFileSize")}</span>
                          </>
                        )}
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("menu.price")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceStr}
                    onChange={(e) =>
                      setFormData({ ...formData, priceStr: e.target.value })
                    }
                    placeholder={t("menu.pricePlaceholder")}
                    required
                    className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("menu.category")}</Label>
                  <Select
                    value={formData.category || "__placeholder__"}
                    onValueChange={(v) => v !== "__placeholder__" && setFormData((prev) => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-black/20 border-border/50">
                      <SelectValue placeholder={t("menu.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__placeholder__" disabled>
                        {t("menu.selectCategory")}
                      </SelectItem>
                      {categoriesForDropdown.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) =>
                    setFormData({ ...formData, isAvailable: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary bg-black/20"
                />
                <Label htmlFor="isAvailable" className="cursor-pointer">
                  {t("menu.activeItem")}
                </Label>
              </div>

              {editingId && (
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div>
                    <h4 className="font-display font-semibold text-foreground">
                      {t("menu.modifiers")}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {t("menu.modifiersPreview")}
                    </p>
                  </div>
                  {isLoadingModifiers ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : !modifierGroups || modifierGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      {t("menu.noModifiers")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {modifierGroups.map((group: any) => (
                        <div key={group.id} className="text-sm">
                          <span className="font-medium text-foreground">
                            {group.name}:
                          </span>{" "}
                          <span className="text-muted-foreground">
                            {group.options
                              ?.map((o: any) => o.name)
                              .join(", ") || t("menu.noOptions")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsModifiersModalOpen(true)}
                      className="rounded-lg h-8 text-xs border-border/50 hover:bg-white/5"
                    >
                      {t("menu.manageModifiers")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="rounded-lg h-8 text-xs border-border/50 hover:bg-white/5"
                    >
                      {t("menu.previewOrderFlow")}
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                  className="rounded-xl"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="rounded-xl"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingId ? t("common.saveChanges") : t("menu.createItem")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ManageModifiersModal
          isOpen={isModifiersModalOpen}
          onClose={() => {
            setIsModifiersModalOpen(false);
          }}
          itemName={formData.name}
          menuItemId={editingId}
          locationId={selectedLocationId}
        />

        <MenuItemPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          itemName={formData.name}
          imageUrl={formData.imageUrl || null}
          groups={(modifierGroups ?? [])
            .filter((g: any) => g.isActive !== false)
            .map((g: any) => ({
              ...g,
              options: (g.options || []).filter((o: any) => o.isActive !== false),
            }))}
        />
      </div>
    </ProtectedRoute>
  );
}
