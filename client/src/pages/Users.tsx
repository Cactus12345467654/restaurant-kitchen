import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth, hasRole } from "@/hooks/use-auth";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { useLocations } from "@/hooks/use-locations";
import { useTranslation } from "@/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: locations } = useLocations();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; username: string } | null>(null);
  
  const ROLE_OPTIONS = [
    { value: "super_admin", labelKey: "users.roleSuperAdmin" },
    { value: "location_admin", labelKey: "users.roleLocationAdmin" },
    { value: "manager", labelKey: "users.roleManager" },
    { value: "kitchen_staff", labelKey: "users.roleKitchen" },
    { value: "waiter", labelKey: "users.roleWaiter" },
  ] as const;

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    roles: ["kitchen_staff"] as string[],
    locationId: "",
    isActive: true,
    timeTrackingPin: ""
  });

  const openCreate = () => {
    setEditingId(null);
    const currentRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : ((currentUser as any)?.role ? [(currentUser as any).role] : []);
    const canSelectLocation = currentRoles.includes('super_admin') || (currentRoles.includes('manager') && !currentUser?.locationId);
    setFormData({ 
      username: "", 
      password: "", 
      roles: ["kitchen_staff"], 
      locationId: canSelectLocation ? "" : String(currentUser?.locationId ?? ""),
      isActive: true,
      timeTrackingPin: ""
    });
    setIsDialogOpen(true);
  };

  const openEdit = (userObj: any) => {
    setEditingId(userObj.id);
    const roles = Array.isArray(userObj.roles) ? userObj.roles : ((userObj as any).role ? [(userObj as any).role] : []);
    setFormData({ 
      username: userObj.username, 
      password: "", // Leave blank unless changing
      roles: roles.length > 0 ? roles : ["kitchen_staff"], 
      locationId: userObj.locationId ? String(userObj.locationId) : "",
      isActive: userObj.isActive,
      timeTrackingPin: ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.roles.length === 0) {
        toast({ title: t("users.validationError"), description: t("users.atLeastOneRole"), variant: "destructive" });
        return;
      }
      const payload: any = {
        username: formData.username,
        roles: formData.roles,
        isActive: formData.isActive,
      };

      if (formData.locationId) {
        payload.locationId = parseInt(formData.locationId);
      } else if (!formData.roles.includes('super_admin')) {
        toast({ title: t("users.validationError"), description: t("users.locationRequired"), variant: "destructive" });
        return;
      }

      if (formData.password) {
        payload.password = formData.password;
      }
      if (formData.timeTrackingPin.trim()) {
        payload.timeTrackingPin = formData.timeTrackingPin.trim();
      }
      if (!formData.password && !editingId) {
        toast({ title: t("users.validationError"), description: t("users.passwordRequired"), variant: "destructive" });
        return;
      }

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: t("users.userUpdated") });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: t("users.userCreated") });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: t("users.userDeleted") });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'location_admin', 'manager']}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("users.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("users.subtitle")}</p>
          </div>
          <Button 
            onClick={openCreate}
            className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> {t("users.addStaff")}
          </Button>
        </div>

        <Card className="border-border/50 bg-card rounded-2xl overflow-hidden shadow-lg shadow-black/5">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground">{t("users.user")}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{t("users.role")}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{t("users.location")}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{t("common.status")}</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => {
                  const loc = locations?.find(l => l.id === u.locationId);
                  return (
                    <TableRow key={u.id} className="border-border/50 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          {u.username}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(u.roles) ? u.roles : [(u as any).role]).map((r) => (
                            <Badge key={r} variant="outline" className="capitalize rounded-md border-border/50">
                              {r.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(Array.isArray(u.roles) ? u.roles : [(u as any).role]).includes('super_admin') ? t("users.globalAll") : (loc?.name || 'Unknown')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-md ${u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                          {u.isActive ? t("common.active") : t("users.deactivated")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="hover:bg-primary/20 hover:text-primary transition-colors" title={t("users.editStaff")}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: u.id, username: u.username })}
                            className="hover:bg-destructive/20 hover:text-destructive transition-colors"
                            title={t("users.deleteStaff")}
                            disabled={currentUser?.id === u.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{editingId ? t("users.editStaff") : t("users.addStaffMember")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("users.email")}</Label>
                <Input 
                  type="email"
                  value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value})} 
                  placeholder={t("users.emailPlaceholder")}
                  required
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("users.password")} {editingId && <span className="text-xs text-muted-foreground">{t("users.passwordKeep")}</span>}</Label>
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  placeholder={editingId ? "••••••••" : t("users.passwordCreate")}
                  required={!editingId}
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              {(editingId || formData.roles.some(r => r === "waiter" || r === "kitchen_staff")) && (
                <div className="space-y-2">
                  <Label>{t("users.timeTrackingPin")}</Label>
                  <Input 
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={formData.timeTrackingPin} 
                    onChange={(e) => setFormData({...formData, timeTrackingPin: e.target.value.replace(/\D/g, "")})} 
                    placeholder={t("users.timeTrackingPinHint")}
                    className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("users.role")}</Label>
                  <div className="rounded-xl border border-border/50 bg-black/20 p-3 space-y-2 min-h-[120px]">
                    {ROLE_OPTIONS.filter(opt => opt.value !== 'super_admin' || hasRole(currentUser, 'super_admin') || hasRole(currentUser, 'manager')).map((opt) => (
                      <div key={opt.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${opt.value}`}
                          checked={formData.roles.includes(opt.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({ ...formData, roles: [...formData.roles, opt.value] });
                            } else {
                              setFormData({ ...formData, roles: formData.roles.filter(r => r !== opt.value) });
                            }
                          }}
                          className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Label htmlFor={`role-${opt.value}`} className="text-sm font-normal cursor-pointer">
                          {t(opt.labelKey)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{t("users.location")}</Label>
                  <Select 
                    value={formData.locationId} 
                    onValueChange={(v) => setFormData({...formData, locationId: v})}
                    disabled={formData.roles.includes('super_admin') || !(hasRole(currentUser, 'super_admin') || hasRole(currentUser, 'manager'))}
                  >
                    <SelectTrigger className="bg-black/20 border-border/50 rounded-xl h-11">
                      <SelectValue placeholder={t("users.selectLocation")} />
                    </SelectTrigger>
                    <SelectContent>
                      {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary bg-black/20"
                />
                <Label htmlFor="isActive" className="cursor-pointer">{t("users.activeAccount")}</Label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">{t("common.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-xl">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? t("common.saveChanges") : t("users.createStaff")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="bg-card border-border/50 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("users.deleteStaff")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("users.deleteConfirm")}
                {deleteTarget && (
                  <span className="block mt-2 font-medium text-foreground">{deleteTarget.username}</span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">{t("common.cancel")}</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="rounded-xl"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("common.delete")}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
