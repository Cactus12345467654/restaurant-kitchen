import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { setupAuth, hashPassword } from "./auth";
import crypto from "crypto";

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

  const requireRole = (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };

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
        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        
        await storage.updateUser(user.id, {
          passwordResetToken: token,
          passwordResetExpires: expires
        });
        
        console.log(`[Email Mock] Password reset link: /reset-password?token=${token}`);
      }
      
      // Always return success to prevent user enumeration
      res.status(200).json({ message: "If that email exists, a reset link was sent." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
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

  app.post(api.locations.create.path, requireAuth, requireRole(['super_admin']), async (req, res) => {
    try {
      const input = api.locations.create.input.parse(req.body);
      const location = await storage.createLocation(input);
      res.status(201).json(location);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.locations.update.path, requireAuth, requireRole(['super_admin', 'location_admin']), async (req, res) => {
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
  app.get(api.users.list.path, requireAuth, requireRole(['super_admin', 'location_admin']), async (req, res) => {
    const user = req.user as any;
    let users = await storage.getUsers();
    
    // Location admin only sees users in their location
    if (user.role === 'location_admin') {
      users = users.filter(u => u.locationId === user.locationId);
    }
    
    res.json(users);
  });

  app.post(api.users.create.path, requireAuth, requireRole(['super_admin', 'location_admin']), async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      
      const currentUser = req.user as any;
      if (currentUser.role === 'location_admin') {
        input.locationId = currentUser.locationId; // Force location for location_admin
        if (input.role === 'super_admin') {
          return res.status(403).json({ message: "Cannot create super_admin" });
        }
      }

      input.password = await hashPassword(input.password);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.users.update.path, requireAuth, requireRole(['super_admin', 'location_admin']), async (req, res) => {
    try {
      const input = api.users.update.input.parse(req.body);
      
      // Hash password if being updated
      if (input.password) {
        input.password = await hashPassword(input.password);
      }
      
      const user = await storage.updateUser(Number(req.params.id), input);
      res.status(200).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Menu Items
  app.get(api.menuItems.list.path, requireAuth, async (req, res) => {
    const items = await storage.getMenuItems(Number(req.params.locationId));
    res.json(items);
  });

  app.post(api.menuItems.create.path, requireAuth, requireRole(['super_admin', 'location_admin', 'manager']), async (req, res) => {
    try {
      const input = api.menuItems.create.input.parse(req.body);
      const item = await storage.createMenuItem(input);
      res.status(201).json(item);
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
      res.status(200).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
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

  // Modifier Groups
  app.get("/api/menu-items/:menuItemId/modifiers", requireAuth, async (req, res) => {
    try {
      const menuItemId = Number(req.params.menuItemId);
      console.log(`[GET /modifiers] Fetching modifiers for menuItemId=${menuItemId}`);
      
      const groups = await storage.getModifierGroupsByMenuItem(menuItemId);
      console.log(`[GET /modifiers] Found ${groups.length} groups: ${JSON.stringify(groups)}`);
      
      // For each group, get its options
      const groupsWithOptions = await Promise.all(groups.map(async (group) => {
        const options = await storage.getModifierOptionsByGroup(group.id);
        return { ...group, options };
      }));
      
      console.log(`[GET /modifiers] Returning: ${JSON.stringify(groupsWithOptions)}`);
      res.json(groupsWithOptions);
    } catch (err) {
      console.error(`[GET /modifiers] Error:`, err);
      res.status(500).json({ error: "Failed to fetch modifiers" });
    }
  });

  app.post("/api/modifier-groups", requireAuth, async (req, res) => {
    try {
      const { name, menuItemId, locationId } = req.body;
      console.log(`[ModifierGroup] Creating: name=${name}, menuItemId=${menuItemId}, locationId=${locationId}`);
      
      if (!name || !menuItemId || !locationId) {
        return res.status(400).json({ error: "Invalid modifier group data" });
      }
      
      const group = await storage.createModifierGroup({ 
        name, 
        menuItemId: Number(menuItemId), 
        locationId: Number(locationId) 
      });
      
      console.log(`[ModifierGroup] Created successfully: ${JSON.stringify(group)}`);
      res.status(201).json(group);
    } catch (err) {
      console.error(`[ModifierGroup] Creation failed:`, err);
      res.status(500).json({ error: "Failed to create modifier group" });
    }
  });

  app.delete("/api/modifier-groups/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteModifierGroup(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: "Failed to delete modifier group" });
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

  app.delete("/api/modifier-options/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteModifierOption(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: "Failed to delete modifier option" });
    }
  });

  return httpServer;
}
