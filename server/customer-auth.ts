/**
 * Customer authentication routes for the Loyalty web app.
 *
 * Flow:
 *   1. Frontend sends Google ID token → POST /api/auth/google
 *   2. Backend verifies token with Google, creates/finds customer row
 *   3. Sets req.session.customerId (HttpOnly cookie, no JWT)
 *   4. GET /api/customer/me returns the full CustomerMe payload
 *   5. POST /api/auth/customer/logout clears the session
 */

import type { Express, Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { randomBytes } from "crypto";
import { db } from "./db";
import {
  customers,
  customerIdentities,
  loyaltyAccounts,
  loyaltyTransactions,
  offers,
  customerOfferActivations,
  customerQrTokens,
  type Customer,
  type LoyaltyAccount,
  type CustomerQrToken,
  type CustomerOfferActivation,
} from "@shared/schema";
import { eq, and, desc, count, gt, asc } from "drizzle-orm";

// ── Session augmentation ─────────────────────────────────────────────────────

declare module "express-session" {
  interface SessionData {
    customerId?: string;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

function buildCustomerMeResponse(
  customer: Customer,
  loyalty: LoyaltyAccount,
  qr: CustomerQrToken,
  identityProviders: string[],
) {
  return {
    id: customer.id,
    displayName: customer.displayName,
    avatarUrl: customer.avatarUrl,
    email: customer.email,
    preferredLanguage: customer.preferredLanguage,
    profile: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      marketingConsent: customer.marketingConsent,
    },
    loyalty: {
      balance: loyalty.balance,
      lifetimePoints: loyalty.lifetimePoints,
      tier: loyalty.tier,
      nextTierAt: loyalty.nextTierAt,
      lastEarnedAt: loyalty.lastEarnedAt?.toISOString() ?? null,
    },
    qr: {
      url: `/api/customer/qr/${qr.token}`,
      rotatedAt: qr.rotatedAt?.toISOString() ?? null,
    },
    identities: identityProviders,
    createdAt: customer.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

async function loadCustomerFull(customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) return null;

  const [loyalty] = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.customerId, customerId))
    .limit(1);

  const [qr] = await db
    .select()
    .from(customerQrTokens)
    .where(eq(customerQrTokens.customerId, customerId))
    .limit(1);

  const identityRows = await db
    .select({ provider: customerIdentities.provider })
    .from(customerIdentities)
    .where(eq(customerIdentities.customerId, customerId));

  return { customer, loyalty, qr, providers: identityRows.map((r) => r.provider) };
}

async function findOrCreateCustomer(googlePayload: {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}) {
  const { sub, email, name, picture } = googlePayload;

  // Try to find existing customer by Google identity
  const [existing] = await db
    .select({ customerId: customerIdentities.customerId })
    .from(customerIdentities)
    .where(
      and(
        eq(customerIdentities.provider, "google"),
        eq(customerIdentities.providerSub, sub),
      ),
    )
    .limit(1);

  if (existing) return existing.customerId;

  // Create new customer
  const newId = crypto.randomUUID();

  await db.insert(customers).values({
    id: newId,
    displayName: name ?? null,
    avatarUrl: picture ?? null,
    email: email ?? null,
    preferredLanguage: "lv",
  });

  await db.insert(customerIdentities).values({
    customerId: newId,
    provider: "google",
    providerSub: sub,
    email: email ?? null,
  });

  await db.insert(loyaltyAccounts).values({
    customerId: newId,
  });

  await db.insert(customerQrTokens).values({
    customerId: newId,
    token: randomBytes(24).toString("hex"),
  });

  return newId;
}

function serializeActivation(a: CustomerOfferActivation) {
  return {
    id: a.id,
    offerId: a.offerId,
    voucherCode: a.voucherCode,
    status: a.status,
    activatedAt: a.activatedAt?.toISOString() ?? null,
    expiresAt: a.expiresAt.toISOString(),
  };
}

// ── Middleware ───────────────────────────────────────────────────────────────

export function requireCustomerAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ── Route registration ───────────────────────────────────────────────────────

export function registerCustomerAuthRoutes(app: Express) {
  // POST /api/auth/google — exchange Google ID token for a customer session
  app.post("/api/auth/google", async (req: Request, res: Response) => {
    const { credential } = req.body as { credential?: string };

    if (!credential) {
      return res.status(400).json({ message: "credential required" });
    }

    if (!GOOGLE_CLIENT_ID) {
      console.error("[customer-auth] GOOGLE_CLIENT_ID env var is not set");
      return res.status(500).json({ message: "Google auth not configured" });
    }

    try {
      const client = new OAuth2Client(GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload?.sub) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const customerId = await findOrCreateCustomer({
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });

      req.session.customerId = customerId;

      const full = await loadCustomerFull(customerId);
      if (!full) {
        return res.status(500).json({ message: "Failed to load customer" });
      }

      return res.json(buildCustomerMeResponse(full.customer, full.loyalty, full.qr, full.providers));
    } catch (err: unknown) {
      console.error("[customer-auth] Google token verification failed:", err);
      return res.status(401).json({ message: "Google authentication failed" });
    }
  });

  // GET /api/customer/me — return the authenticated customer's profile
  app.get("/api/customer/me", requireCustomerAuth, async (req: Request, res: Response) => {
    try {
      const full = await loadCustomerFull(req.session.customerId!);
      if (!full) {
        req.session.customerId = undefined;
        return res.status(401).json({ message: "Customer not found" });
      }
      return res.json(buildCustomerMeResponse(full.customer, full.loyalty, full.qr, full.providers));
    } catch (err: unknown) {
      console.error("[customer-auth] GET /customer/me error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // PATCH /api/customer/me — update display name / language / marketing consent
  app.patch("/api/customer/me", requireCustomerAuth, async (req: Request, res: Response) => {
    try {
      const customerId = req.session.customerId!;
      const { displayName, preferredLanguage, profile } = req.body as {
        displayName?: string;
        preferredLanguage?: string;
        profile?: { marketingConsent?: boolean };
      };

      const updates: Partial<typeof customers.$inferInsert> = {};
      if (typeof displayName === "string" || displayName === null) updates.displayName = displayName ?? null;
      if (typeof preferredLanguage === "string") updates.preferredLanguage = preferredLanguage;
      if (typeof profile?.marketingConsent === "boolean") updates.marketingConsent = profile.marketingConsent;

      if (Object.keys(updates).length > 0) {
        await db.update(customers).set(updates).where(eq(customers.id, customerId));
      }

      const full = await loadCustomerFull(customerId);
      if (!full) return res.status(404).json({ message: "Customer not found" });

      return res.json(buildCustomerMeResponse(full.customer, full.loyalty, full.qr, full.providers));
    } catch (err: unknown) {
      console.error("[customer-auth] PATCH /customer/me error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/customer/me/transactions — paginated transaction history
  app.get("/api/customer/me/transactions", requireCustomerAuth, async (req: Request, res: Response) => {
    try {
      const customerId = req.session.customerId!;
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(loyaltyTransactions)
          .where(eq(loyaltyTransactions.customerId, customerId))
          .orderBy(desc(loyaltyTransactions.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ total: count() })
          .from(loyaltyTransactions)
          .where(eq(loyaltyTransactions.customerId, customerId)),
      ]);

      return res.json({ items: rows, total: Number(total), page, limit });
    } catch (err: unknown) {
      console.error("[customer-auth] GET /customer/me/transactions error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/customer/me/offers — available active offers
  app.get("/api/customer/me/offers", requireCustomerAuth, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const rows = await db
        .select()
        .from(offers)
        .where(and(eq(offers.isActive, true), gt(offers.validUntil, now)))
        .orderBy(asc(offers.validUntil));

      return res.json(rows.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        imageUrl: o.imageUrl,
        pointsRequired: o.pointsRequired,
        rewardType: o.rewardType,
        rewardValue: o.rewardValue,
        validUntil: o.validUntil.toISOString(),
      })));
    } catch (err: unknown) {
      console.error("[customer-auth] GET /customer/me/offers error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // GET /api/customer/me/offers/active — customer's activated vouchers
  app.get("/api/customer/me/offers/active", requireCustomerAuth, async (req: Request, res: Response) => {
    try {
      const customerId = req.session.customerId!;
      const rows = await db
        .select()
        .from(customerOfferActivations)
        .where(eq(customerOfferActivations.customerId, customerId))
        .orderBy(desc(customerOfferActivations.activatedAt));

      return res.json(rows.map(serializeActivation));
    } catch (err: unknown) {
      console.error("[customer-auth] GET /customer/me/offers/active error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/customer/me/offers/:id/activate — activate an offer
  app.post("/api/customer/me/offers/:id/activate", requireCustomerAuth, async (req: Request, res: Response) => {
    try {
      const customerId = req.session.customerId!;
      const offerId = parseInt(req.params.id);
      if (!Number.isInteger(offerId)) {
        return res.status(400).json({ message: "Invalid offer id" });
      }

      const [offer] = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
      if (!offer || !offer.isActive || offer.validUntil <= new Date()) {
        return res.status(404).json({ message: "Offer not found or expired" });
      }

      // Prevent duplicate active activation for the same offer
      const [existing] = await db
        .select({ id: customerOfferActivations.id })
        .from(customerOfferActivations)
        .where(
          and(
            eq(customerOfferActivations.customerId, customerId),
            eq(customerOfferActivations.offerId, offerId),
            eq(customerOfferActivations.status, "active"),
          ),
        )
        .limit(1);

      if (existing) {
        return res.status(409).json({ message: "Offer already activated" });
      }

      const [activation] = await db
        .insert(customerOfferActivations)
        .values({
          customerId,
          offerId,
          voucherCode: randomBytes(4).toString("hex").toUpperCase(),
          status: "active",
          expiresAt: offer.validUntil,
        })
        .returning();

      return res.status(201).json(serializeActivation(activation));
    } catch (err: unknown) {
      console.error("[customer-auth] POST /customer/me/offers/:id/activate error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // POST /api/auth/customer/dev-login — development-only: create/use test customer (no Google)
  // Enabled when not in production (covers NODE_ENV=development and unset in dev)
  if (process.env.NODE_ENV !== "production") {
    app.post("/api/auth/customer/dev-login", async (req: Request, res: Response) => {
      try {
        const DEV_PROVIDER = "dev";
        const DEV_PROVIDER_SUB = "dev-test-user";

        const [existing] = await db
          .select({ customerId: customerIdentities.customerId })
          .from(customerIdentities)
          .where(
            and(
              eq(customerIdentities.provider, DEV_PROVIDER),
              eq(customerIdentities.providerSub, DEV_PROVIDER_SUB),
            ),
          )
          .limit(1);

        let customerId: string;
        if (existing) {
          customerId = existing.customerId;
        } else {
          customerId = crypto.randomUUID();
          await db.insert(customers).values({
            id: customerId,
            displayName: "Test Customer (Dev)",
            email: "dev@test.local",
            preferredLanguage: "lv",
          });
          await db.insert(customerIdentities).values({
            customerId,
            provider: DEV_PROVIDER,
            providerSub: DEV_PROVIDER_SUB,
            email: "dev@test.local",
          });
          await db.insert(loyaltyAccounts).values({ customerId });
          await db.insert(customerQrTokens).values({
            customerId,
            token: randomBytes(24).toString("hex"),
          });
        }

        req.session.customerId = customerId;
        const full = await loadCustomerFull(customerId);
        if (!full) {
          return res.status(500).json({ message: "Failed to load customer" });
        }
        return res.json(buildCustomerMeResponse(full.customer, full.loyalty, full.qr, full.providers));
      } catch (err: unknown) {
        console.error("[customer-auth] dev-login error:", err);
        return res.status(500).json({ message: "Dev login failed" });
      }
    });
  }

  // POST /api/auth/customer/logout — clear customer session
  app.post("/api/auth/customer/logout", (req: Request, res: Response) => {
    req.session.customerId = undefined;
    return res.status(204).send();
  });
}
