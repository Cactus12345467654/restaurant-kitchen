import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  MapPin, 
  UtensilsCrossed, 
  Users as UsersIcon, 
  ChefHat,
  LogOut,
  Layers,
  ConciergeBell,
  BarChart3,
  Clock,
  Hash,
  Gift,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();

  if (!user) return null;

  const userRoles = Array.isArray(user.roles) ? user.roles : ((user as any).role ? [(user as any).role] : []);
  
  const navItems = [
    {
      title: t("nav.dashboard"),
      icon: LayoutDashboard,
      href: "/",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: t("nav.locations"),
      icon: MapPin,
      href: "/locations",
      roles: ["super_admin"],
    },
    {
      title: t("nav.menu"),
      icon: UtensilsCrossed,
      href: "/menu",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: t("nav.modifiers"),
      icon: Layers,
      href: "/modifiers",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: t("nav.users"),
      icon: UsersIcon,
      href: "/users",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: t("nav.timeTracking"),
      icon: Clock,
      href: "/time-tracking",
      roles: ["super_admin", "location_admin", "manager"],
    },
    {
      title: t("nav.waiter"),
      icon: ConciergeBell,
      href: "/waiter",
      roles: ["super_admin", "location_admin", "manager", "waiter"],
    },
    {
      title: t("nav.kitchen"),
      icon: ChefHat,
      href: "/kitchen",
      roles: ["super_admin", "location_admin", "manager", "kitchen_staff"],
    },
    {
      title: t("nav.statistics"),
      icon: BarChart3,
      href: "/statistics",
      roles: ["super_admin", "location_admin"],
    },
    {
      title: t("nav.loyalty"),
      icon: Gift,
      href: "/loyalty",
      roles: ["super_admin", "location_admin"],
    },
    {
      title: t("nav.orderNumberScreen"),
      icon: Hash,
      href: "/order-numbers",
      roles: ["super_admin", "location_admin", "manager", "waiter", "kitchen_staff"],
    },
  ];

  const allowedItems = navItems.filter(item => item.roles.some(r => userRoles.includes(r)));

  return (
    <Sidebar variant="inset" className="border-r border-border/50 dark:border-r dark:border-white/50">
      <SidebarContent className="bg-card">
        <div className="p-6 pb-2">
          <h1 className="text-2xl font-bold text-gradient-primary font-display flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-primary" />
            {t("nav.brand")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            {t("nav.subtitle")}
          </p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-6 mt-4 mb-2">
            {t("nav.navigation")}
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

      <SidebarFooter className="bg-card p-4 border-t border-border/50 dark:border-t dark:border-white/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold truncate text-foreground">{user.username}</span>
              <span className="text-xs text-muted-foreground capitalize truncate">
              {(Array.isArray(user.roles) ? user.roles : ((user as any).role ? [(user as any).role] : [])).map((r: string) => r.replace('_', ' ')).join(', ')}
            </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("common.signOut")}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
