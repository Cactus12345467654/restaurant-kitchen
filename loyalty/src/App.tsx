import { Switch, Route, Redirect } from "wouter";
import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import LoyaltyPage from "@/pages/loyalty/LoyaltyPage";
import OffersPage from "@/pages/offers/OffersPage";
import QrPage from "@/pages/qr/QrPage";
import ProfilePage from "@/pages/profile/ProfilePage";
import NotFoundPage from "@/pages/NotFoundPage";

/**
 * Route map
 *
 * PUBLIC
 *   /login                Google Sign In
 *
 * AUTHENTICATED (RequireAuth + AppLayout)
 *   /                     → redirect to /loyalty
 *   /loyalty              Points balance, tier, transaction history
 *   /offers               Active offers, activation flow
 *   /qr                   Customer QR code display + rotation
 *   /profile              Profile display name, language, marketing consent
 *
 * FUTURE (not yet wired)
 *   /qr/pay               Single-use payment QR (Phase 2)
 *   /rewards              Reward catalogue (Phase 2)
 *   /locations/:id/*      Domain-based location override (Phase 2)
 */
export default function App() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={LoginPage} />

      {/* Authenticated */}
      <Route path="/">
        <RequireAuth>
          <Redirect to="/loyalty" />
        </RequireAuth>
      </Route>

      <Route path="/loyalty">
        <RequireAuth>
          <AppLayout>
            <LoyaltyPage />
          </AppLayout>
        </RequireAuth>
      </Route>

      <Route path="/offers">
        <RequireAuth>
          <AppLayout>
            <OffersPage />
          </AppLayout>
        </RequireAuth>
      </Route>

      <Route path="/qr">
        <RequireAuth>
          <AppLayout>
            <QrPage />
          </AppLayout>
        </RequireAuth>
      </Route>

      <Route path="/profile">
        <RequireAuth>
          <AppLayout>
            <ProfilePage />
          </AppLayout>
        </RequireAuth>
      </Route>

      {/* Fallback */}
      <Route component={NotFoundPage} />
    </Switch>
  );
}
