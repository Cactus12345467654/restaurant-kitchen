/**
 * Route guard for authenticated pages.
 * Redirects to /login when no customer session is active.
 * Shows nothing while the session check is in flight.
 */
import { useLocation, Redirect } from "wouter";
import { useCustomer } from "@/hooks/useCustomer";

interface Props {
  children: React.ReactNode;
}

export default function RequireAuth({ children }: Props) {
  const { data: customer, isLoading } = useCustomer();
  const [location] = useLocation();

  if (isLoading) return null;

  if (!customer) {
    const next = encodeURIComponent(location);
    return <Redirect to={`/login?next=${next}`} />;
  }

  return <>{children}</>;
}
