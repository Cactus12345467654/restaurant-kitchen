/**
 * Bottom navigation bar for mobile loyalty app.
 * Tabs: Loyalty | Offers | QR | Profile
 */
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/loyalty", label: "Punkti" },
  { href: "/offers", label: "Piedāvājumi" },
  { href: "/qr", label: "QR" },
  { href: "/profile", label: "Profils" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 border-t bg-white flex">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "flex-1 py-3 text-center text-xs font-medium",
            location === tab.href ? "text-primary" : "text-muted-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
