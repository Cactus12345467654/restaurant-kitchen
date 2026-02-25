import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  MapPin, 
  UtensilsCrossed, 
  Users as UsersIcon, 
  ChefHat,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const role = user.role;
  
  const navItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: "Locations",
      icon: MapPin,
      href: "/locations",
      roles: ["super_admin"],
    },
    {
      title: "Menu Management",
      icon: UtensilsCrossed,
      href: "/menu",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: "User Management",
      icon: UsersIcon,
      href: "/users",
      roles: ["super_admin", "location_admin"],
    },
    {
      title: "Kitchen Screen",
      icon: ChefHat,
      href: "/kitchen",
      roles: ["super_admin", "location_admin", "manager", "kitchen_staff"],
    },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  return (
    <Sidebar variant="inset" className="border-r border-border/50">
      <SidebarContent className="bg-card">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-bold text-gradient-primary font-display flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            Brio
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            Kitchen Management
          </p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-6 mt-4 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 space-y-1">
              {allowedItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} className={`
                      rounded-xl transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/10 text-primary hover:bg-primary/15 font-semibold' 
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                      }
                    `}>
                      <Link href={item.href} className="flex items-center gap-3 px-3 py-2.5">
                        <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-card p-4 border-t border-border/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-foreground">{user.username}</span>
              <span className="text-xs text-muted-foreground capitalize truncate">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
