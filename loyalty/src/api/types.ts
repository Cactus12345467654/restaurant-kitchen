/**
 * Shared API response types for the loyalty app.
 * Mirrors the backend /api/customer/* response shapes.
 */

// ── Customer ────────────────────────────────────────────────────────────────

export interface CustomerProfile {
  firstName: string | null;
  lastName: string | null;
  marketingConsent: boolean;
}

export interface LoyaltySnapshot {
  balance: number;
  lifetimePoints: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  nextTierAt: number | null;
  lastEarnedAt: string | null;
}

export interface QrInfo {
  url: string;
  rotatedAt: string | null;
}

export interface CustomerMe {
  id: string;                      // uuid
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  preferredLanguage: string;
  profile: CustomerProfile;
  loyalty: LoyaltySnapshot;
  qr: QrInfo;
  identities: string[];            // ["google"]
  createdAt: string;
}

// ── Loyalty transactions ────────────────────────────────────────────────────

export type TransactionType = "earn" | "redeem" | "expire" | "adjust" | "bonus";

export interface LoyaltyTransaction {
  id: number;
  type: TransactionType;
  delta: number;
  balanceAfter: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
}

export interface TransactionPage {
  items: LoyaltyTransaction[];
  total: number;
  page: number;
  limit: number;
}

// ── Rewards ─────────────────────────────────────────────────────────────────

export type RewardType = "discount" | "free_item" | "item" | "offer";

export interface Reward {
  id: number;
  title: string;
  description: string | null;
  pointsRequired: number;
  rewardType: RewardType;
  rewardValue: Record<string, unknown>;
}

// ── Offers ──────────────────────────────────────────────────────────────────

export interface Offer {
  id: number;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsRequired: number;
  rewardType: RewardType;
  rewardValue: Record<string, unknown>;
  validUntil: string;
}

export interface OfferActivation {
  id: number;
  offerId: number;
  voucherCode: string;
  status: "active" | "used" | "expired" | "cancelled";
  activatedAt: string;
  expiresAt: string;
}
