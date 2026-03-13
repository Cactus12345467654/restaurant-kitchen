import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Used by connect-pg-simple (express-session). Defined here so drizzle-kit push does not drop it.
export const session = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: text("sess").notNull(), // JSON stored as text by connect-pg-simple
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

export type ScreenOrientation = "auto" | "horizontal" | "vertical-left" | "vertical-right";

/** Location configuration shape - keys from reference template "Cactus Burrito Bar" */
export interface LocationConfig {
  defaultCategory?: string;
  categoryOrder?: string[];
  pagerEnabled?: boolean;
  pagerCount?: number;
  takeawayEnabled?: boolean;
  /** Image shown when no orders are ready. */
  waitingImageUrl?: string | null;
  /** Physical screen orientation for the customer display. */
  screenOrientation?: ScreenOrientation;
  [key: string]: unknown;
}

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  config: jsonb("config").$type<LocationConfig>().default({}),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(), // Used as email
  password: text("password").notNull(),
  roles: text("roles").array().notNull(), // ['super_admin', 'location_admin', 'kitchen_staff', 'waiter', 'manager']
  locationId: integer("location_id").references(() => locations.id),
  isActive: boolean("is_active").default(true),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  timeTrackingPin: text("time_tracking_pin"), // Hashed 4-digit code for time tracking check-in
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  pausedAt: timestamp("paused_at", { withTimezone: true }),
  totalPauseMinutes: integer("total_pause_minutes").notNull().default(0),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  name: text("name").notNull(),
  price: integer("price").notNull(), // stored in cents
  category: text("category").notNull(),
  isAvailable: boolean("is_available").default(true),
  imageUrl: text("image_url"),
  imageData: text("image_data"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const uploadedImages = pgTable("uploaded_images", {
  id: serial("id").primaryKey(),
  data: text("data").notNull(),
  mimeType: text("mime_type").notNull().default("image/jpeg"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const modifierGroups = pgTable("modifier_groups", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isRequired: boolean("is_required").notNull().default(false),
  dependsOnOptionId: integer("depends_on_option_id"), // optional FK to modifier_options.id (no DB FK to avoid circular ref)
  dependsOnGroupId: integer("depends_on_group_id").references(() => modifierGroups.id),
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

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id),
  status: text("status").notNull().default("gatavojas"),
  items: jsonb("items").$type<string[]>().notNull(),
  pagerNumber: integer("pager_number"),
  pagerCalled: boolean("pager_called").default(false),
  totalPriceCents: integer("total_price_cents"),
  isTakeaway: boolean("is_takeaway").default(false),
  /** Čeka numurs (dienas rindas nr) – parādās UI un čekā visās lokācijās. */
  receiptOrderNumber: integer("receipt_order_number"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Which modifier groups are attached to which menu items (shared groups: one group, many items)
export const menuItemModifierGroups = pgTable(
  "menu_item_modifier_groups",
  {
    menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id, { onDelete: "cascade" }),
    modifierGroupId: integer("modifier_group_id").notNull().references(() => modifierGroups.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.menuItemId, t.modifierGroupId] })]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  location: one(locations, {
    fields: [users.locationId],
    references: [locations.id],
  }),
  timeEntries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, { fields: [timeEntries.userId], references: [users.id] }),
  location: one(locations, { fields: [timeEntries.locationId], references: [locations.id] }),
}));

export const modifierGroupsRelations = relations(modifierGroups, ({ one, many }) => ({
  location: one(locations, {
    fields: [modifierGroups.locationId],
    references: [locations.id],
  }),
  menuItem: one(menuItems, {
    fields: [modifierGroups.menuItemId],
    references: [menuItems.id],
  }),
  options: many(modifierOptions),
}));

export const modifierOptionsRelations = relations(modifierOptions, ({ one }) => ({
  group: one(modifierGroups, {
    fields: [modifierOptions.modifierGroupId],
    references: [modifierGroups.id],
  }),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  location: one(locations, {
    fields: [menuItems.locationId],
    references: [locations.id],
  }),
  modifierGroups: many(modifierGroups),
}));

export const insertLocationSchema = createInsertSchema(locations).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({ roles: z.array(z.string()).min(1, "At least one role is required") });
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
export type UpdateUserRequest = Partial<InsertUser> & {
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  timeTrackingPin?: string | null;
};

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

export type CreateMenuItemRequest = InsertMenuItem;
export type UpdateMenuItemRequest = Partial<InsertMenuItem>;

export type CreateModifierGroupRequest = InsertModifierGroup;
export type UpdateModifierGroupRequest = Partial<InsertModifierGroup>;

export type CreateModifierOptionRequest = InsertModifierOption;
export type UpdateModifierOptionRequest = Partial<InsertModifierOption>;
