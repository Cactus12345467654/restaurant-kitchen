import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // Used as email
  password: text("password").notNull(),
  role: text("role").notNull(), // 'super_admin', 'location_admin', 'kitchen_staff', 'manager'
  locationId: integer("location_id").references(() => locations.id),
  isActive: boolean("is_active").default(true),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  name: text("name").notNull(),
  price: integer("price").notNull(), // stored in cents
  category: text("category").notNull(),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const modifierGroups = pgTable("modifier_groups", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const modifierOptions = pgTable("modifier_options", {
  id: serial("id").primaryKey(),
  modifierGroupId: integer("modifier_group_id").notNull().references(() => modifierGroups.id),
  name: text("name").notNull(),
  priceDelta: integer("price_delta").notNull().default(0), // stored in cents
  isDefault: boolean("is_default").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
}));

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
  location: one(locations, {
    fields: [modifierGroups.locationId],
    references: [locations.id],
  }),
  options: many(modifierOptions),
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
  group: one(modifierGroups, {
    fields: [modifierOptions.modifierGroupId],
    references: [modifierGroups.id],
  }),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  location: one(locations, {
    fields: [menuItems.locationId],
    references: [locations.id],
  }),
}));

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordResetToken: true, passwordResetExpires: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true, createdAt: true });
export const insertModifierGroupSchema = createInsertSchema(modifierGroups).omit({ id: true, createdAt: true, updatedAt: true });
export const insertModifierOptionSchema = createInsertSchema(modifierOptions).omit({ id: true, createdAt: true, updatedAt: true });

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type InsertModifierGroup = z.infer<typeof insertModifierGroupSchema>;

export type ModifierOption = typeof modifierOptions.$inferSelect;
export type InsertModifierOption = z.infer<typeof insertModifierOptionSchema>;

export type CreateLocationRequest = InsertLocation;
export type UpdateLocationRequest = Partial<InsertLocation>;

export type CreateUserRequest = InsertUser;
export type UpdateUserRequest = Partial<InsertUser>;

export type CreateMenuItemRequest = InsertMenuItem;
export type UpdateMenuItemRequest = Partial<InsertMenuItem>;

export type CreateModifierGroupRequest = InsertModifierGroup;
export type UpdateModifierGroupRequest = Partial<InsertModifierGroup>;

export type CreateModifierOptionRequest = InsertModifierOption;
export type UpdateModifierOptionRequest = Partial<InsertModifierOption>;
