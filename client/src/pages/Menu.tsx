import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/use-auth";
import { useLocations } from "@/hooks/use-locations";
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from "@/hooks/use-menu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function ManageModifiersModal({ isOpen, onClose, itemName }: { isOpen: boolean, onClose: () => void, itemName: string }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Manage Modifiers</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4 text-center">
          <p className="font-medium text-foreground">{itemName}</p>
          <p className="text-muted-foreground italic">Modifier configuration UI coming next step.</p>
          <div className="pt-4 flex justify-end">
            <Button onClick={onClose} className="rounded-xl">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Menu() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Admin needs to select location. Managers/Location Admins use their own.
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    user?.role !== 'super_admin' && user?.locationId ? user.locationId : null
  );

  const { data: locations } = useLocations();
  const { data: menuItems, isLoading } = useMenuItems(selectedLocationId);
  const createMutation = useCreateMenuItem(selectedLocationId);
  const updateMutation = useUpdateMenuItem(selectedLocationId);
  const deleteMutation = useDeleteMenuItem(selectedLocationId);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    priceStr: "",
    category: "",
    isAvailable: true
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: "", priceStr: "", category: "", isAvailable: true });
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({ 
      name: item.name, 
      priceStr: (item.price / 100).toFixed(2), 
      category: item.category, 
      isAvailable: item.isAvailable 
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Item deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) return;

    const priceCents = Math.round(parseFloat(formData.priceStr) * 100);
    if (isNaN(priceCents) || priceCents < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name,
      price: priceCents,
      category: formData.category,
      isAvailable: formData.isAvailable,
      locationId: selectedLocationId
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Item updated" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "Item created" });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'location_admin', 'manager']}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Menu</h1>
            <p className="text-muted-foreground mt-1">Manage items and availability</p>
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {user?.role === 'super_admin' && (
              <Select 
                value={selectedLocationId?.toString() || ""} 
                onValueChange={(val) => setSelectedLocationId(parseInt(val))}
              >
                <SelectTrigger className="w-[200px] h-11 bg-card border-border/50 rounded-xl">
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map(loc => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button 
              onClick={openCreate}
              disabled={!selectedLocationId}
              className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>
        </div>

        {!selectedLocationId ? (
          <Card className="p-12 border-border/50 bg-card rounded-2xl flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-display font-semibold">No Location Selected</h3>
            <p className="text-muted-foreground mt-2">Please select a location above to view its menu.</p>
          </Card>
        ) : (
          <Card className="border-border/50 bg-card rounded-2xl overflow-hidden shadow-lg shadow-black/5">
            {isLoading ? (
              <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="font-semibold text-muted-foreground">Item Name</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Category</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Price</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No menu items found. Add your first one!
                      </TableCell>
                    </TableRow>
                  )}
                  {menuItems?.map((item) => (
                    <TableRow key={item.id} className="border-border/50 hover:bg-white/5 transition-colors">
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <Badge variant="outline" className="rounded-md border-border/50 text-xs">
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">${(item.price / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-md ${item.isAvailable ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-destructive/10 text-destructive hover:bg-destructive/20'}`}>
                          {item.isAvailable ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)} className="hover:bg-primary/20 hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="hover:bg-destructive/20 hover:text-destructive transition-colors ml-1">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border/50 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">{editingId ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Truffle Pasta"
                  required
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.priceStr} 
                    onChange={(e) => setFormData({...formData, priceStr: e.target.value})} 
                    placeholder="24.99"
                    required
                    className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input 
                    value={formData.category} 
                    onChange={(e) => setFormData({...formData, category: e.target.value})} 
                    placeholder="e.g. Mains"
                    required
                    className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isAvailable"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                  className="w-4 h-4 rounded border-border/50 text-primary focus:ring-primary bg-black/20"
                />
                <Label htmlFor="isAvailable" className="cursor-pointer">Active</Label>
              </div>

              {editingId && (
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div>
                    <h4 className="font-display font-semibold text-foreground">Modifiers</h4>
                    <p className="text-xs text-muted-foreground">Configuration preview (read-only)</p>
                  </div>
                  <p className="text-sm text-muted-foreground italic">No modifiers configured yet.</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsModifiersModalOpen(true)}
                    className="rounded-lg h-8 text-xs border-border/50 hover:bg-white/5"
                  >
                    Manage Modifiers
                  </Button>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-xl">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Item'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ManageModifiersModal 
          isOpen={isModifiersModalOpen} 
          onClose={() => setIsModifiersModalOpen(false)} 
          itemName={formData.name}
        />
      </div>
    </ProtectedRoute>
  );
}
