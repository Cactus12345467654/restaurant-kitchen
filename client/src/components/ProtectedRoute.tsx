import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { AppLayout } from "./layout/AppLayout";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const [_, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && allowedRoles) {
      const userRoles = Array.isArray(user.roles) ? user.roles : ((user as any).role ? [(user as any).role] : []);
      const hasAccess = allowedRoles.some((r) => userRoles.includes(r));
      if (!hasAccess) {
      if (userRoles.includes('kitchen_staff')) {
        setLocation("/kitchen");
      } else if (userRoles.includes('waiter')) {
        setLocation("/waiter");
      } else {
        setLocation("/");
      }
      }
    }
  }, [user, isLoading, setLocation, allowedRoles]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const userRoles = user ? (Array.isArray(user.roles) ? user.roles : ((user as any).role ? [(user as any).role] : [])) : [];
  const hasAccess = !allowedRoles || allowedRoles.some((r) => userRoles.includes(r));
  if (!user || !hasAccess) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}
