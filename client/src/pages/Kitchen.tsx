import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Clock, Flame, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock orders for the placeholder kitchen screen
const mockOrders = [
  { id: '1024', time: '12:30 PM', status: 'new', items: ['2x Truffle Pasta', '1x Garlic Bread'] },
  { id: '1025', time: '12:32 PM', status: 'new', items: ['1x Caesar Salad', '1x Ribeye Steak'] },
  { id: '1022', time: '12:15 PM', status: 'preparing', items: ['3x Vegan Burger', '1x Fries'] },
  { id: '1023', time: '12:20 PM', status: 'preparing', items: ['1x Margherita Pizza'] },
];

export default function Kitchen() {
  const { user } = useAuth();

  return (
    <ProtectedRoute allowedRoles={['super_admin', 'location_admin', 'manager', 'kitchen_staff']}>
      <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Kitchen Display</h1>
            <p className="text-emerald-500 font-medium mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              Live Orders
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 h-full min-h-[500px]">
          {/* Column 1: New */}
          <div className="bg-black/20 border border-border/50 rounded-3xl p-4 flex flex-col">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center text-blue-400">
              <Clock className="w-5 h-5 mr-2" /> New Orders (2)
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2">
              {mockOrders.filter(o => o.status === 'new').map(order => (
                <Card key={order.id} className="p-4 bg-card border-l-4 border-l-blue-500 border-t-0 border-r-0 border-b-0 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-xl">#{order.id}</span>
                    <span className="text-muted-foreground text-sm font-mono">{order.time}</span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-foreground font-medium flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-bold">
                    Start Preparing
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="bg-black/20 border border-border/50 rounded-3xl p-4 flex flex-col">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center text-orange-400">
              <Flame className="w-5 h-5 mr-2" /> Preparing (2)
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2">
              {mockOrders.filter(o => o.status === 'preparing').map(order => (
                <Card key={order.id} className="p-4 bg-card border-l-4 border-l-orange-500 border-t-0 border-r-0 border-b-0 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-xl">#{order.id}</span>
                    <span className="text-orange-400 text-sm font-mono flex items-center animate-pulse">
                      <Flame className="w-3 h-3 mr-1" /> Cooking
                    </span>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {order.items.map((item, i) => (
                      <li key={i} className="text-foreground font-medium flex items-start">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 mr-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Ready
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Column 3: Ready (Empty State Example) */}
          <div className="bg-black/20 border border-border/50 rounded-3xl p-4 flex flex-col">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Ready to Serve
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center opacity-50">
              <UtensilsCrossed className="w-12 h-12 mb-3 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">No orders waiting</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Additional import needed for the empty state
import { UtensilsCrossed } from "lucide-react";
