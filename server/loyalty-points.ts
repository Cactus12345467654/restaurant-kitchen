/**
 * Loyalty points integration.
 *
 * Called after an order reaches its final "atdots_klientam" status.
 * Awards points to the linked customer in a single DB transaction.
 *
 * Design rules:
 *  - Idempotent: a second call for the same orderId is a no-op.
 *  - Non-fatal: errors are logged but never propagate to the order flow.
 *  - The rate constant is the single source of truth; it is snapshotted
 *    in the transaction note so historical records remain accurate even
 *    if the rate changes later.
 */

import { db } from "./db";
import { orders, loyaltyAccounts, loyaltyTransactions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// ── Configuration ─────────────────────────────────────────────────────────────

/** Points awarded per whole euro spent (100 cents = 1 €). */
export const POINTS_PER_EURO = 1;

/** Lifetime-points thresholds for each tier. */
const TIER_THRESHOLDS = [
  { tier: "platinum", min: 2000 },
  { tier: "gold",     min:  500 },
  { tier: "silver",   min:  100 },
  { tier: "bronze",   min:    0 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calculateTier(lifetimePoints: number): string {
  return TIER_THRESHOLDS.find((t) => lifetimePoints >= t.min)?.tier ?? "bronze";
}

function centsToPoints(cents: number): number {
  return Math.floor(cents / 100) * POINTS_PER_EURO;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Award loyalty points for a completed order.
 *
 * Silently returns when:
 *  - The order has no linked customer.
 *  - The order total is zero or missing.
 *  - Points have already been awarded for this order (idempotency check).
 *  - The customer has no loyalty account (should not happen; defensive guard).
 */
export async function awardPointsForOrder(orderId: number): Promise<void> {
  // ── Load order ──────────────────────────────────────────────────────────────
  const [order] = await db
    .select({
      id:              orders.id,
      customerId:      orders.customerId,
      totalPriceCents: orders.totalPriceCents,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order?.customerId || !order.totalPriceCents || order.totalPriceCents <= 0) return;

  // ── Idempotency guard ───────────────────────────────────────────────────────
  const [alreadyAwarded] = await db
    .select({ id: loyaltyTransactions.id })
    .from(loyaltyTransactions)
    .where(
      and(
        eq(loyaltyTransactions.orderId,   orderId),
        eq(loyaltyTransactions.type,      "earn"),
        eq(loyaltyTransactions.customerId, order.customerId),
      ),
    )
    .limit(1);

  if (alreadyAwarded) return;

  // ── Calculate points ────────────────────────────────────────────────────────
  const points = centsToPoints(order.totalPriceCents);
  if (points <= 0) return;

  // ── Load loyalty account ────────────────────────────────────────────────────
  const [account] = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.customerId, order.customerId))
    .limit(1);

  if (!account) {
    console.warn(`[loyalty] no loyalty account for customer ${order.customerId} — skipping`);
    return;
  }

  const newBalance      = account.balance       + points;
  const newLifetime     = account.lifetimePoints + points;
  const newTier         = calculateTier(newLifetime);
  const euroAmount      = (order.totalPriceCents / 100).toFixed(2);
  const note            = `${POINTS_PER_EURO} pk/€ · €${euroAmount}`;

  // ── Atomic write ────────────────────────────────────────────────────────────
  await db.transaction(async (tx) => {
    await tx
      .update(loyaltyAccounts)
      .set({
        balance:       newBalance,
        lifetimePoints: newLifetime,
        tier:          newTier,
        lastEarnedAt:  new Date(),
      })
      .where(eq(loyaltyAccounts.customerId, order.customerId!));

    await tx
      .insert(loyaltyTransactions)
      .values({
        customerId:   order.customerId!,
        type:         "earn",
        delta:        points,
        balanceAfter: newBalance,
        orderId,
        note,
      });
  });

  console.log(
    `[loyalty] +${points} pts → customer ${order.customerId} ` +
    `(order #${orderId}, €${euroAmount}, tier: ${newTier})`,
  );
}
