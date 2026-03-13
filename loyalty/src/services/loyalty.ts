/**
 * Loyalty service — API calls for points, transactions, rewards and offers.
 */
import { apiClient } from "@/api/client";
import type {
  LoyaltySnapshot,
  TransactionPage,
  Reward,
  Offer,
  OfferActivation,
} from "@/api/types";

// ── Points ──────────────────────────────────────────────────────────────────

export function fetchLoyaltyBalance(): Promise<LoyaltySnapshot> {
  return apiClient.get<LoyaltySnapshot>("/customer/me/points");
}

// ── Transaction history ─────────────────────────────────────────────────────

export function fetchTransactions(
  page = 1,
  limit = 20,
): Promise<TransactionPage> {
  return apiClient.get<TransactionPage>(
    `/customer/me/transactions?page=${page}&limit=${limit}`,
  );
}

// ── Rewards ─────────────────────────────────────────────────────────────────

export function fetchRewards(): Promise<Reward[]> {
  return apiClient.get<Reward[]>("/customer/me/rewards");
}

export function redeemReward(rewardId: number): Promise<{ ok: boolean }> {
  return apiClient.post<{ ok: boolean }>(`/customer/me/rewards/${rewardId}/redeem`);
}

// ── Offers ──────────────────────────────────────────────────────────────────

export function fetchOffers(): Promise<Offer[]> {
  return apiClient.get<Offer[]>("/customer/me/offers");
}

export function activateOffer(offerId: number): Promise<OfferActivation> {
  return apiClient.post<OfferActivation>(`/customer/me/offers/${offerId}/activate`);
}

export function fetchActiveVouchers(): Promise<OfferActivation[]> {
  return apiClient.get<OfferActivation[]>("/customer/me/offers/active");
}
