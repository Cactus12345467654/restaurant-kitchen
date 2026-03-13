/**
 * Shell layout for authenticated pages.
 * Renders page content above the bottom navigation bar.
 */
import BottomNav from "./BottomNav";

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  return (
    <div className="min-h-screen pb-16">
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
