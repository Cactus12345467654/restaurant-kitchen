import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from "@/hooks/use-locations";
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
import { Plus, MapPin, Edit2, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Locations() {
  const { data: locations, isLoading } = useLocations();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const deleteMutation = useDeleteLocation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "" });
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "", address: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (loc: any) => {
    setEditingId(loc.id);
    setFormData({ name: loc.name, address: loc.address });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...formData });
        toast({ title: t("locations.updated") });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: t("locations.created_toast") });
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
      toast({ title: t("locations.deleted") });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'manager']}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{t("locations.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("locations.subtitle")}</p>
          </div>
          <Button 
            onClick={openCreate}
            className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> {t("locations.addLocation")}
          </Button>
        </div>

        <Card className="border-border/50 bg-card rounded-2xl overflow-hidden shadow-lg shadow-black/5">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground">{t("common.name")}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{t("locations.address")}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{t("locations.created")}</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      {t("locations.noLocations")}
                    </TableCell>
                  </TableRow>
                )}
                {locations?.map((loc) => (
                  <TableRow key={loc.id} className="border-border/50 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {loc.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{loc.address}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {loc.createdAt ? format(new Date(loc.createdAt), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(loc)} className="hover:bg-primary/20 hover:text-primary transition-colors" title={t("locations.editLocation")}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget({ id: loc.id, name: loc.name })}
                          className="hover:bg-destructive/20 hover:text-destructive transition-colors"
                          title={t("locations.deleteLocation")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{editingId ? t("locations.editLocation") : t("locations.addNew")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{t("locations.locationName")}</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder={t("locations.locationNamePlaceholder")}
                  required
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("locations.address")}</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value})} 
                  placeholder={t("locations.addressPlaceholder")}
                  required
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">{t("common.cancel")}</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-xl">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? t("common.saveChanges") : t("locations.createLocation")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent className="bg-card border-border/50 rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("locations.deleteLocation")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("locations.deleteConfirm")}
                {deleteTarget && (
                  <span className="block mt-2 font-medium text-foreground">{deleteTarget.name}</span>
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
