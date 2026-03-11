import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { initNewLocationConfig } from "./location-config";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { setupAuth, hashPassword } from "./auth";
import crypto from "crypto";
import { sendPasswordResetEmail } from "./email";

const uploadsDir = path.join(process.cwd(), "uploads");
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (_) {}

const MAX_UPLOAD_MB = 5;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      const name = crypto.randomBytes(16).toString("hex") + ext;
      cb(null, name);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication first
  setupAuth(app);

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireRole = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    if (!user || !allowedRoles.some((r) => userRoles.includes(r))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

  // DELETE /api/locations/:id - use middleware to avoid Express 5 route matching issues
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "DELETE" || !/^\/api\/locations\/\d+$/.test(req.path)) {
      return next();
    }
    const id = Number(req.path.split("/").pop());
    requireAuth(req, res, () => {
      requireRole(["super_admin", "manager"])(req, res, async () => {
        try {
          const location = await storage.getLocation(id);
          if (!location) {
            return res.status(404).json({ message: "Location not found" });
          }
          await storage.deleteLocation(id);
          res.status(204).send();
        } catch (err: any) {
          res.status(500).json({ message: err?.message || "Internal server error" });
        }
      });
    });
  });

  // Serve uploaded files (public URLs)
  app.use("/uploads", express.static(uploadsDir));

  // Upload route on dedicated router so it is matched before any catch-all (e.g. Vite)
  const uploadRouter = express.Router();
  uploadRouter.post(
    "/",
    requireAuth,
    requireRole(["super_admin", "location_admin", "manager"]),
    (req: Request, res: Response, next: NextFunction) => {
      upload.single("file")(req, res, (err: any) => {
        if (err) {
          res.setHeader("Content-Type", "application/json");
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
              message: `Fails ir pārāk liels. Maksimāli atļauts: ${MAX_UPLOAD_MB} MB.`,
            });
          }
          return res.status(500).json({ message: err.message || "Upload failed" });
        }
        next();
      });
    },
    (req: Request, res: Response) => {
      res.setHeader("Content-Type", "application/json");
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const filePath = path.join(uploadsDir, req.file.filename);
        const fileBuffer = fs.readFileSync(filePath);
        const mime = req.file.mimetype || "image/jpeg";
        const imageData = `data:${mime};base64,${fileBuffer.toString("base64")}`;
        const url = "/uploads/" + req.file.filename;
        res.status(200).json({ url, imageData });
        return;
      } catch (err: any) {
        return res.status(500).json({ message: err?.message || "Upload failed" });
      }
    }
  );
  app.use("/api/upload", uploadRouter);
  app.use("/api/upload/", uploadRouter);

  app.get("/api/menu-items/:id/image", async (req: Request, res: Response) => {
    try {
      const item = await storage.getMenuItem(Number(req.params.id));
      if (!item?.imageData) {
        return res.status(404).json({ message: "No image" });
      }
      const match = item.imageData.match(/^data:(.+);base64,(.+)$/);
      if (!match) {
        return res.status(404).json({ message: "Invalid image data" });
      }
      const mime = match[1];
      const buffer = Buffer.from(match[2], "base64");
      res.setHeader("Content-Type", mime);
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.send(buffer);
    } catch {
      return res.status(500).json({ message: "Failed to load image" });
    }
  });

  // Auth Routes
  app.post(api.auth.login.path, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);

      const existingUsers = await storage.getUsers();
      if (existingUsers.length > 0) {
        return res.status(403).json({
          message:
            "Registration is disabled after the first admin is created. Please ask an admin to add users.",
        });
      }

      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        username: input.username,
        password: hashedPassword,
        roles: ["super_admin"],
        isActive: true,
      } as any);

      return res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(200).json(null);
    }
    res.status(200).json(req.user);
  });

  app.post(api.auth.forgotPassword.path, async (req, res) => {
    try {
      const input = api.auth.forgotPassword.input.parse(req.body);
      const user = await storage.getUserByUsername(input.username);
      
      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await storage.updateUser(user.id, {
          passwordResetToken: token,
          passwordResetExpires: expires,
        } as any);

        try {
          await sendPasswordResetEmail(user.username, token);
        } catch (emailErr: any) {
          console.error("[forgot-password] Email send failed:", emailErr?.message);
          // Still return success - token was saved; user can request again if email failed
        }
      }
      
      // Always return success to prevent user enumeration
      res.status(200).json({ message: "If that email exists, a reset link was sent." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[forgot-password] Error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.resetPassword.path, async (req, res) => {
    try {
      const input = api.auth.resetPassword.input.parse(req.body);
      
      // Find user by token
      const users = await storage.getUsers();
      const user = users.find(u => 
        u.passwordResetToken === input.token && 
        u.passwordResetExpires && 
        u.passwordResetExpires > new Date()
      );
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      const hashedPassword = await hashPassword(input.newPassword);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null
      });
      
      res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Locations
  app.get(api.locations.list.path, requireAuth, async (req, res) => {
    const locations = await storage.getLocations();
    res.json(locations);
  });

  app.post(api.locations.create.path, requireAuth, requireRole(['super_admin', 'manager']), async (req, res) => {
    try {
      const input = api.locations.create.input.parse(req.body);
      const location = await storage.createLocation(input);
      await initNewLocationConfig(location.id);
      const updated = await storage.getLocation(location.id);
      res.status(201).json(updated ?? location);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.locations.update.path, requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    try {
      const input = api.locations.update.input.parse(req.body);
      const location = await storage.updateLocation(Number(req.params.id), input);
      res.status(200).json(location);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Users
  const usersRouter = express.Router();
  usersRouter.use(requireAuth, requireRole(['super_admin', 'location_admin', 'manager']));

  // DELETE /api/users/:id - must be registered BEFORE router so it matches first
  app.delete("/api/users/:id", requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    try {
      const targetId = Number(req.params.id);
      const currentUser = req.user as any;

      if (currentUser.id === targetId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      const targetUser = await storage.getUser(targetId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : (currentUser?.role ? [currentUser.role] : []);
      const targetRoles = Array.isArray((targetUser as any)?.roles) ? (targetUser as any).roles : ((targetUser as any)?.role ? [(targetUser as any).role] : []);
      if (currentRoles.includes('location_admin') || (currentRoles.includes('manager') && currentUser?.locationId)) {
        if (targetRoles.includes('super_admin')) {
          return res.status(403).json({ message: "Cannot delete super admin" });
        }
        if (targetUser.locationId !== currentUser.locationId) {
          return res.status(403).json({ message: "Cannot delete user from another location" });
        }
      }

      await storage.deleteUser(targetId);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  usersRouter.get("/", async (req, res) => {
    const user = req.user as any;
    const userRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);
    let users = await storage.getUsers();
    if ((userRoles.includes('location_admin') || (userRoles.includes('manager') && user?.locationId)) && user?.locationId) {
      users = users.filter(u => u.locationId === user.locationId);
    }
    res.json(users);
  });

  usersRouter.post("/", async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const currentUser = req.user as any;
      const currentRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : (currentUser?.role ? [currentUser.role] : []);
      if (currentRoles.includes('location_admin') || (currentRoles.includes('manager') && currentUser?.locationId)) {
        input.locationId = currentUser.locationId;
        if (input.roles?.includes('super_admin')) {
          return res.status(403).json({ message: "Cannot create super_admin" });
        }
      }
      input.password = await hashPassword(input.password);
      const created = await storage.createUser(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  usersRouter.put("/:id", async (req, res) => {
    try {
      const raw = api.users.update.input.parse(req.body) as Record<string, unknown>;
      const { role: _role, ...input } = raw;
      const currentUser = req.user as any;
      const currentRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : (currentUser?.role ? [currentUser.role] : []);
      const inputRoles = input.roles;
      if (inputRoles !== undefined && (!Array.isArray(inputRoles) || inputRoles.length === 0)) {
        return res.status(400).json({ message: "At least one role is required" });
      }
      if ((currentRoles.includes('location_admin') || (currentRoles.includes('manager') && currentUser?.locationId)) && inputRoles?.includes('super_admin')) {
        return res.status(403).json({ message: "Cannot assign super_admin" });
      }
      if (input.password) {
        input.password = await hashPassword(input.password as string);
      }
      const user = await storage.updateUser(Number(req.params.id), input as any);
      res.status(200).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.use("/api/users", usersRouter);

  // Menu Items
  app.get(api.menuItems.list.path, requireAuth, async (req, res) => {
    try {
      const locationId = Number(req.params.locationId);
      if (!Number.isFinite(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      const items = await storage.getMenuItems(locationId);
      const normalized = items.map((it: any) => {
        const { imageData: _drop, ...rest } = it;
        const imageUrl = it.imageData
          ? `/api/menu-items/${it.id}/image`
          : (it.imageUrl ?? it.image_url ?? null);
        return { ...rest, imageUrl };
      });
      return res.json(normalized);
    } catch (err: any) {
      console.error("GET /api/locations/:locationId/menu-items error:", err);
      const message = err?.message?.includes("column") && err?.message?.includes("does not exist")
        ? "Database schema may be out of date. Run: npm run db:push"
        : (err?.message || "Failed to fetch menu items");
      return res.status(500).json({ message });
    }
  });

  app.post(api.menuItems.create.path, requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    try {
      const input = api.menuItems.create.input.parse(req.body);
      const item = await storage.createMenuItem(input);
      const { imageData: _drop, ...rest } = item as any;
      res.status(201).json({ ...rest, imageUrl: item.imageData ? `/api/menu-items/${item.id}/image` : item.imageUrl });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.menuItems.update.path, requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    try {
      const input = api.menuItems.update.input.parse(req.body);
      const item = await storage.updateMenuItem(Number(req.params.id), input);
      const { imageData: _drop, ...rest } = item as any;
      res.status(200).json({ ...rest, imageUrl: item.imageData ? `/api/menu-items/${item.id}/image` : item.imageUrl });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/locations/:locationId/menu-items/reorder", requireAuth, requireRole(["super_admin", "location_admin", "manager"]), async (req, res) => {
    try {
      const items = req.body as { id: number; sortOrder: number }[];
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Array of {id, sortOrder} required" });
      }
      await Promise.all(
        items.map((item) =>
          storage.updateMenuItem(item.id, { sortOrder: item.sortOrder } as any)
        )
      );
      return res.status(200).json({ updated: items.length });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to reorder" });
    }
  });

  app.post("/api/locations/:locationId/categories/rename", requireAuth, requireRole(["super_admin", "location_admin", "manager"]), async (req, res) => {
    try {
      const locationId = Number(req.params.locationId);
      const { oldName, newName } = req.body as { oldName?: string; newName?: string };
      if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
        return res.status(400).json({ message: "oldName and newName required" });
      }
      const count = await storage.renameCategory(locationId, oldName.trim(), newName.trim());
      return res.status(200).json({ updated: count });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to rename category" });
    }
  });

  app.post("/api/locations/:locationId/categories/delete", requireAuth, requireRole(["super_admin", "location_admin", "manager"]), async (req, res) => {
    try {
      const locationId = Number(req.params.locationId);
      const { categoryName } = req.body as { categoryName?: string };
      if (!categoryName || typeof categoryName !== "string") {
        return res.status(400).json({ message: "categoryName required" });
      }
      const name = categoryName.trim();
      if (name === "Uncategorized") {
        return res.status(400).json({ message: "Cannot delete the default Uncategorized category" });
      }
      const count = await storage.renameCategory(locationId, name, "Uncategorized");
      return res.status(200).json({ updated: count });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to delete category" });
    }
  });

  // Orders (waiter → kitchen sync across devices)
  app.post("/api/locations/:locationId/orders", requireAuth, requireRole(["super_admin", "location_admin", "manager", "waiter"]), async (req, res) => {
    try {
      const locationId = Number(req.params.locationId);
      if (!Number.isFinite(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      const { items, pagerNumber, totalPriceCents } = req.body as { items?: string[]; pagerNumber?: number | null; totalPriceCents?: number | null };
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "items array required" });
      }
      const order = await storage.createOrder({ locationId, items, pagerNumber, totalPriceCents });
      return res.status(201).json(order);
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to create order" });
    }
  });

  app.get("/api/locations/:locationId/orders", requireAuth, async (req, res) => {
    try {
      const locationId = Number(req.params.locationId);
      if (!Number.isFinite(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      const statusParam = req.query.status as string | undefined;
      const statuses = statusParam ? statusParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
      const ordersList = await storage.getOrdersByLocation(locationId, statuses);
      return res.json(ordersList);
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to fetch orders" });
    }
  });

  app.patch("/api/orders/:id", requireAuth, requireRole(["super_admin", "location_admin", "manager", "kitchen_staff", "waiter"]), async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      if (!Number.isFinite(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const { status, pagerCalled } = req.body as { status?: string; pagerCalled?: boolean };
      if (status != null) {
        await storage.updateOrderStatus(orderId, status);
      }
      if (pagerCalled !== undefined) {
        await storage.updateOrderPagerCalled(orderId, pagerCalled);
      }
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to update order" });
    }
  });

  app.get("/api/orders", requireAuth, requireRole(["super_admin", "location_admin", "manager"]), async (req, res) => {
    try {
      const locationIdParam = req.query.locationId;
      const locationId = locationIdParam != null && locationIdParam !== "" ? Number(locationIdParam) : null;
      const user = req.user as { locationId?: number; location_id?: number } | undefined;
      const userLocId = user?.locationId ?? user?.location_id ?? null;
      const effectiveLocationId = locationId ?? userLocId;
      const ordersList = await storage.getAllOrders(
        effectiveLocationId != null && Number.isFinite(effectiveLocationId) ? effectiveLocationId : undefined
      );
      return res.json(ordersList);
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to fetch orders" });
    }
  });

  app.delete(api.menuItems.delete.path, requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    await storage.deleteMenuItem(Number(req.params.id));
    res.sendStatus(204);
  });

  // Reports
  app.get(api.reports.overview.path, requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    const locationId = req.query.locationId ? Number(req.query.locationId) : undefined;
    
    let allItems = [];
    if (locationId) {
      allItems = await storage.getMenuItems(locationId);
    } else {
      // Mock for super admin if no location specified
      const locations = await storage.getLocations();
      for (const loc of locations) {
        const items = await storage.getMenuItems(loc.id);
        allItems.push(...items);
      }
    }
    
    // Mock reports
    res.json({
      totalOrders: 154,
      totalRevenue: 452000, // $4520.00
      activeItems: allItems.filter(i => i.isAvailable).length
    });
  });

  // Modifier Groups (all for a location - for "add existing group" dropdown and library page)
  app.get("/api/locations/:locationId/modifier-groups", requireAuth, async (req, res) => {
    try {
      const locationId = Number(req.params.locationId);
      if (!Number.isInteger(locationId)) return res.status(400).json({ error: "Invalid locationId" });
      const groups = await storage.getModifierGroups(locationId);
      const withCounts = await Promise.all(
        groups.map(async (g) => {
          const options = await storage.getModifierOptions(g.id);
          return {
            ...g,
            isRequired: g.isRequired ?? (g as any).is_required ?? false,
            optionsCount: options.length,
          };
        })
      );
      res.json(withCounts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch modifier groups" });
    }
  });

  app.get("/api/menu-items/:menuItemId/modifiers", requireAuth, async (req, res) => {
    try {
      const menuItemId = Number(req.params.menuItemId);
      const activeOnly = req.query.activeOnly === "true";
      const menuItem = await storage.getMenuItem(menuItemId);
      const loc =
        menuItem &&
        ((menuItem as { locationId?: number; location_id?: number }).locationId ??
          (menuItem as { locationId?: number; location_id?: number }).location_id);
      const locationId =
        loc != null && Number.isFinite(Number(loc)) ? Number(loc) : undefined;
      let groups = await storage.getModifierGroupsByMenuItem(menuItemId, locationId);
      if (activeOnly) {
        groups = groups.filter((g) => g.isActive !== false);
      }

      // For each group, get its options (normalize isActive for client)
      const groupsWithOptions = await Promise.all(
        groups.map(async (group) => {
          const options = await storage.getModifierOptions(group.id);
          const normalized = options.map((o: any) => ({
            ...o,
            isActive: o.isActive ?? o.is_active ?? true,
          }));
          return {
            ...group,
            isRequired: group.isRequired ?? (group as any).is_required ?? false,
            options: normalized,
          };
        }),
      );
      res.json(groupsWithOptions);
    } catch (err) {
      console.error(`[GET /modifiers] Error:`, err);
      res.status(500).json({ error: "Failed to fetch modifiers" });
    }
  });

  app.post("/api/modifier-groups", requireAuth, async (req, res) => {
    try {
      const { name, menuItemId, locationId, dependsOnOptionId, dependsOnGroupId } = req.body;
      if (!name || !locationId) {
        return res.status(400).json({ error: "Invalid modifier group data (name and locationId required)" });
      }
      const locId = Number(locationId);
      const payload: Record<string, unknown> = {
        name: String(name).trim(),
        locationId: locId,
        menuItemId: menuItemId != null && menuItemId !== "" ? Number(menuItemId) : null,
      };
      if (dependsOnOptionId != null) payload.dependsOnOptionId = Number(dependsOnOptionId);
      if (dependsOnGroupId != null) payload.dependsOnGroupId = Number(dependsOnGroupId);
      if (req.body.isRequired !== undefined) payload.isRequired = Boolean(req.body.isRequired);
      const group = await storage.createModifierGroup(payload as any);
      const mid = menuItemId != null && menuItemId !== "" ? Number(menuItemId) : null;
      if (mid != null && group?.id != null) {
        await storage.attachModifierGroupToItem(mid, group.id);
      }
      console.log(`[ModifierGroup] Created successfully: ${JSON.stringify(group)}`);
      res.status(201).json(group);
    } catch (err: any) {
      console.error(`[ModifierGroup] Creation failed:`, err);
      res.status(500).json({ error: err?.message || "Failed to create modifier group" });
    }
  });

  app.put("/api/modifier-groups/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = req.body as { name?: string; sortOrder?: number; isActive?: boolean; isRequired?: boolean; dependsOnOptionId?: number | null; dependsOnGroupId?: number | null };
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No updates provided" });
      }
      const payload: Record<string, unknown> = {};
      if (typeof updates.name === "string") payload.name = updates.name;
      if (typeof updates.sortOrder === "number") payload.sortOrder = updates.sortOrder;
      if (typeof updates.isActive === "boolean") payload.isActive = updates.isActive;
      if (typeof updates.isRequired === "boolean") payload.isRequired = updates.isRequired;
      if (updates.dependsOnOptionId !== undefined) payload.dependsOnOptionId = updates.dependsOnOptionId == null ? null : Number(updates.dependsOnOptionId);
      if (updates.dependsOnGroupId !== undefined) payload.dependsOnGroupId = updates.dependsOnGroupId == null ? null : Number(updates.dependsOnGroupId);
      const group = await storage.updateModifierGroup(id, payload as any);
      const g = group as Record<string, unknown>;
      res.status(200).json({
        ...g,
        isRequired: g.isRequired ?? (g as any).is_required ?? false,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to update modifier group" });
    }
  });

  app.delete("/api/modifier-groups/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Invalid modifier group id" });
      }
      await storage.deleteModifierGroup(id);
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[DELETE modifier-groups]", err);
      res.status(500).json({
        error: err?.message || "Failed to delete modifier group",
      });
    }
  });

  // Attach existing modifier group to menu item
  app.post("/api/menu-items/:menuItemId/modifier-groups", requireAuth, async (req, res) => {
    try {
      const menuItemId = Number(req.params.menuItemId);
      const { modifierGroupId } = req.body as { modifierGroupId?: number };
      if (!Number.isInteger(menuItemId) || modifierGroupId == null || !Number.isInteger(Number(modifierGroupId))) {
        return res.status(400).json({ error: "menuItemId and modifierGroupId required" });
      }
      await storage.attachModifierGroupToItem(menuItemId, Number(modifierGroupId));
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to attach modifier group" });
    }
  });

  // Detach modifier group from one menu item (group stays for other items)
  app.delete("/api/menu-items/:menuItemId/modifier-groups/:groupId", requireAuth, async (req, res) => {
    try {
      const menuItemId = Number(req.params.menuItemId);
      const groupId = Number(req.params.groupId);
      if (!Number.isInteger(menuItemId) || !Number.isInteger(groupId)) {
        return res.status(400).json({ error: "Invalid menuItemId or groupId" });
      }
      await storage.detachModifierGroupFromItem(menuItemId, groupId);
      res.status(200).json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Failed to detach modifier group" });
    }
  });

  // Modifier Options
  app.post("/api/modifier-options", requireAuth, async (req, res) => {
    try {
      const { name, priceDelta, modifierGroupId } = req.body;
      if (!name || modifierGroupId === undefined) {
        return res.status(400).json({ error: "Invalid modifier option data" });
      }
      const option = await storage.createModifierOption({ 
        name, 
        priceDelta: Number(priceDelta || 0), 
        modifierGroupId: Number(modifierGroupId) 
      });
      res.status(201).json(option);
    } catch (err) {
      res.status(500).json({ error: "Failed to create modifier option" });
    }
  });

  app.put("/api/modifier-options/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const updates = (req.body && typeof req.body === "object") ? req.body as { name?: string; priceDelta?: number; sortOrder?: number; isActive?: boolean } : {};
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No updates provided" });
      }
      const payload: Record<string, unknown> = {};
      if (typeof updates.name === "string") payload.name = updates.name;
      if (typeof updates.priceDelta === "number") payload.priceDelta = updates.priceDelta;
      if (typeof updates.sortOrder === "number") payload.sortOrder = updates.sortOrder;
      if (typeof updates.isActive === "boolean") payload.isActive = updates.isActive;
      console.log(`[PUT /modifier-options/${id}] payload:`, JSON.stringify(payload));
      const option = await storage.updateModifierOption(id, payload as any);
      if (!option) {
        return res.status(404).json({ error: "Modifier option not found" });
      }
      const o = option as Record<string, unknown>;
      const isActive =
        typeof o.isActive === "boolean" ? o.isActive
        : typeof (o as any).is_active === "boolean" ? (o as any).is_active
        : true;
      console.log(`[PUT /modifier-options/${id}] DB returned isActive=${isActive}, raw:`, JSON.stringify({ isActive: o.isActive, is_active: (o as any).is_active }));
      return res.status(200).json({ ...o, isActive });
    } catch (err) {
      return res.status(500).json({ error: "Failed to update modifier option" });
    }
  });

  app.delete("/api/modifier-options/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteModifierOption(Number(req.params.id));
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete modifier option" });
    }
  });

  return httpServer;
}
