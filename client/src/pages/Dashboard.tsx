import { useAuth } from "@/hooks/use-auth";
import { useReports } from "@/hooks/use-reports";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Utensils, TrendingUp } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

// Mock data for the chart since the API only returns high-level overview
const mockChartData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 5000 },
  { name: 'Thu', revenue: 4500 },
  { name: 'Fri', revenue: 6000 },
  { name: 'Sat', revenue: 8000 },
  { name: 'Sun', revenue: 7500 },
];

export default function Dashboard() {
  const { user } = useAuth();
  
  // Managers and Location Admins only see their location's stats
  const locationId = user?.role !== 'super_admin' ? user?.locationId : undefined;
  const { data: reports, isLoading } = useReports(locationId);

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'location_admin', 'manager']}>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === 'super_admin' 
              ? "Overview across all locations" 
              : "Overview for your location"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <ShoppingBag className="w-16 h-16 text-primary" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Orders</p>
              <h3 className="text-4xl font-display font-bold text-foreground">
                {isLoading ? "-" : reports?.totalOrders.toLocaleString() || 0}
              </h3>
              <p className="text-xs text-emerald-400 mt-2 flex items-center font-medium">
                <TrendingUp className="w-3 h-3 mr-1" /> +12% from last week
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <DollarSign className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
              <h3 className="text-4xl font-display font-bold text-foreground">
                {isLoading ? "-" : `$${((reports?.totalRevenue || 0) / 100).toFixed(2)}`}
              </h3>
              <p className="text-xs text-emerald-400 mt-2 flex items-center font-medium">
                <TrendingUp className="w-3 h-3 mr-1" /> +8% from last week
              </p>
            </div>
          </Card>

          <Card className="p-6 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Utensils className="w-16 h-16 text-blue-500" />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground mb-1">Active Menu Items</p>
              <h3 className="text-4xl font-display font-bold text-foreground">
                {isLoading ? "-" : reports?.activeItems || 0}
              </h3>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Currently available
              </p>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-card border-border/50 shadow-lg shadow-black/5 rounded-2xl">
          <div className="mb-6">
            <h3 className="text-lg font-semibold font-display">Revenue Overview (Mocked)</h3>
            <p className="text-sm text-muted-foreground">Daily performance tracking</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="name" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{ fill: '#27272A' }}
                  contentStyle={{ backgroundColor: '#09090B', border: '1px solid #27272A', borderRadius: '12px' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
