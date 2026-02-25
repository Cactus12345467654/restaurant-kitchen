import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/use-auth";
import { useUsers, useCreateUser, useUpdateUser } from "@/hooks/use-users";
import { useLocations } from "@/hooks/use-locations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Loader2, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: locations } = useLocations();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "kitchen_staff",
    locationId: "",
    isActive: true
  });

  const openCreate = () => {
    setEditingId(null);
    setFormData({ 
      username: "", 
      password: "", 
      role: "kitchen_staff", 
      locationId: currentUser?.role !== 'super_admin' ? String(currentUser?.locationId) : "",
      isActive: true 
    });
    setIsDialogOpen(true);
  };

  const openEdit = (userObj: any) => {
    setEditingId(userObj.id);
    setFormData({ 
      username: userObj.username, 
      password: "", // Leave blank unless changing
      role: userObj.role, 
      locationId: userObj.locationId ? String(userObj.locationId) : "",
      isActive: userObj.isActive 
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        username: formData.username,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.locationId) {
        payload.locationId = parseInt(formData.locationId);
      } else if (formData.role !== 'super_admin') {
        toast({ title: "Validation Error", description: "Location is required for this role", variant: "destructive" });
        return;
      }

      if (formData.password) {
        payload.password = formData.password;
      } else if (!editingId) {
        toast({ title: "Validation Error", description: "Password is required for new users", variant: "destructive" });
        return;
      }

      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...payload });
        toast({ title: "User updated" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "User created" });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'location_admin']}>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground mt-1">Manage system access and roles</p>
          </div>
          <Button 
            onClick={openCreate}
            className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>

        <Card className="border-border/50 bg-card rounded-2xl overflow-hidden shadow-lg shadow-black/5">
          {isLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground">User</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Role</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Location</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right font-semibold text-muted-foreground">Actions</TableHead>
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
                        <Badge variant="outline" className="capitalize rounded-md border-border/50">
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.role === 'super_admin' ? 'Global (All)' : (loc?.name || 'Unknown')}
                      </TableCell>
                      <TableCell>
                        <Badge className={`rounded-md ${u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="hover:bg-primary/20 hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </Button>
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
              <DialogTitle className="font-display text-xl">{editingId ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Email / Username</Label>
                <Input 
                  type="email"
                  value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value})} 
                  placeholder="staff@brio.com"
                  required
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Password {editingId && <span className="text-xs text-muted-foreground">(leave blank to keep unchanged)</span>}</Label>
                <Input 
                  type="password"
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  placeholder={editingId ? "••••••••" : "Create password"}
                  required={!editingId}
                  className="bg-black/20 border-border/50 focus:border-primary rounded-xl h-11"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                    <SelectTrigger className="bg-black/20 border-border/50 rounded-xl h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentUser?.role === 'super_admin' && <SelectItem value="super_admin">Super Admin</SelectItem>}
                      <SelectItem value="location_admin">Location Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select 
                    value={formData.locationId} 
                    onValueChange={(v) => setFormData({...formData, locationId: v})}
                    disabled={formData.role === 'super_admin' || (currentUser?.role !== 'super_admin')}
                  >
                    <SelectTrigger className="bg-black/20 border-border/50 rounded-xl h-11">
                      <SelectValue placeholder="Select..." />
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
                <Label htmlFor="isActive" className="cursor-pointer">Active Account</Label>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="rounded-xl">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Staff'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
