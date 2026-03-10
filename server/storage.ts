import { db } from "./db";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import {
  users,
  locations,
  menuItems,
  modifierGroups,
  modifierOptions,
  menuItemModifierGroups,
  orders,
  type User,
  type InsertUser,
  type Location,
  type InsertLocation,
  type MenuItem,
  type InsertMenuItem,
  type ModifierGroup,
  type InsertModifierGroup,
  type ModifierOption,
  type InsertModifierOption,
  type UpdateUserRequest,
  type UpdateLocationRequest,
  type UpdateMenuItemRequest,
  type UpdateModifierGroupRequest,
  type UpdateModifierOptionRequest,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: UpdateUserRequest): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, updates: UpdateLocationRequest): Promise<Location>;
  deleteLocation(id: number): Promise<void>;

  // Menu Items
  getMenuItems(locationId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: UpdateMenuItemRequest): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  renameCategory(locationId: number, oldName: string, newName: string): Promise<number>;

  // Modifier Groups
  getModifierGroups(locationId: number): Promise<ModifierGroup[]>;
  getModifierGroupsByMenuItem(menuItemId: number): Promise<ModifierGroup[]>;
  getModifierGroup(id: number): Promise<ModifierGroup | undefined>;
  createModifierGroup(group: InsertModifierGroup): Promise<ModifierGroup>;
  updateModifierGroup(
    id: number,
    updates: UpdateModifierGroupRequest,
  ): Promise<ModifierGroup>;
  deleteModifierGroup(id: number): Promise<void>;
  attachModifierGroupToItem(menuItemId: number, modifierGroupId: number): Promise<void>;
  detachModifierGroupFromItem(menuItemId: number, modifierGroupId: number): Promise<void>;

  // Modifier Options
  getModifierOptions(groupId: number): Promise<ModifierOption[]>;
  getModifierOption(id: number): Promise<ModifierOption | undefined>;
  createModifierOption(option: InsertModifierOption): Promise<ModifierOption>;
  updateModifierOption(
    id: number,
    updates: UpdateModifierOptionRequest,
  ): Promise<ModifierOption>;
  deleteModifierOption(id: number): Promise<void>;

  // Orders
  createOrder(data: { locationId: number; items: string[]; pagerNumber?: number | null; totalPriceCents?: number | null }): Promise<{ id: string; time: string; status: string; items: string[]; pagerNumber: number | null; pagerCalled: boolean; totalPriceCents: number | null; completedAt: string | null }>;
  getOrdersByLocation(locationId: number, statuses?: string[]): Promise<{ id: string; time: string; status: string; items: string[]; pagerNumber: number | null; pagerCalled: boolean; totalPriceCents: number | null; completedAt: string | null }[]>;
  getAllOrders(locationId?: number | null): Promise<{ id: string; time: string; status: string; items: string[]; pagerNumber: number | null; pagerCalled: boolean; totalPriceCents: number | null; completedAt: string | null }[]>;
  updateOrderStatus(orderId: number, status: string): Promise<void>;
  updateOrderPagerCalled(orderId: number, pagerCalled: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: UpdateUserRequest): Promise<User> {
    const { role: _role, ...safeUpdates } = updates as UpdateUserRequest & { role?: unknown };
    const [user] = await db
      .update(users)
      .set(safeUpdates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db
      .insert(locations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateLocation(
    id: number,
    updates: UpdateLocationRequest,
  ): Promise<Location> {
    const [location] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async deleteLocation(id: number): Promise<void> {
    const locationId = Number(id);
    const groups = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.locationId, locationId));
    for (const g of groups) {
      await db.delete(menuItemModifierGroups).where(eq(menuItemModifierGroups.modifierGroupId, g.id));
      await db.delete(modifierOptions).where(eq(modifierOptions.modifierGroupId, g.id));
      await db.delete(modifierGroups).where(eq(modifierGroups.id, g.id));
    }
    const items = await db.select().from(menuItems).where(eq(menuItems.locationId, locationId));
    for (const item of items) {
      await db.delete(menuItemModifierGroups).where(eq(menuItemModifierGroups.menuItemId, item.id));
    }
    await db.delete(menuItems).where(eq(menuItems.locationId, locationId));
    await db.delete(orders).where(eq(orders.locationId, locationId));
    await db.update(users).set({ locationId: null }).where(eq(users.locationId, locationId));
    await db.delete(locations).where(eq(locations.id, locationId));
  }

  // Orders
  async createOrder(data: { locationId: number; items: string[]; pagerNumber?: number | null; totalPriceCents?: number | null }) {
    const [row] = await db.insert(orders).values({
      locationId: data.locationId,
      items: data.items,
      pagerNumber: data.pagerNumber ?? null,
      totalPriceCents: data.totalPriceCents ?? null,
      status: "gatavojas",
    }).returning();
    const d = new Date(row.createdAt ?? new Date());
    const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    return {
      id: String(row.id),
      time,
      status: row.status,
      items: row.items,
      pagerNumber: row.pagerNumber,
      pagerCalled: row.pagerCalled ?? false,
      totalPriceCents: row.totalPriceCents,
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  }

  async getOrdersByLocation(locationId: number, statuses?: string[]) {
    const rows = await db.select().from(orders).where(eq(orders.locationId, locationId));
    const filtered = statuses?.length
      ? rows.filter((r) => statuses.includes(r.status))
      : rows;
    return filtered.map((r) => ({
      id: String(r.id),
      time: r.createdAt ? `${new Date(r.createdAt).getHours().toString().padStart(2, "0")}:${new Date(r.createdAt).getMinutes().toString().padStart(2, "0")}` : "00:00",
      status: r.status,
      items: r.items,
      pagerNumber: r.pagerNumber,
      pagerCalled: r.pagerCalled ?? false,
      totalPriceCents: r.totalPriceCents,
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  }

  async getAllOrders(locationId?: number | null) {
    const rows = locationId != null
      ? await db.select().from(orders).where(eq(orders.locationId, locationId))
      : await db.select().from(orders);
    return rows.map((r) => ({
      id: String(r.id),
      time: r.createdAt ? `${new Date(r.createdAt).getHours().toString().padStart(2, "0")}:${new Date(r.createdAt).getMinutes().toString().padStart(2, "0")}` : "00:00",
      status: r.status,
      items: r.items,
      pagerNumber: r.pagerNumber,
      pagerCalled: r.pagerCalled ?? false,
      totalPriceCents: r.totalPriceCents,
      completedAt: r.completedAt?.toISOString() ?? null,
    }));
  }

  async updateOrderStatus(orderId: number, status: string) {
    const updates: Record<string, unknown> = { status };
    if (status === "gatavs" || status === "atdots_klientam") {
      updates.completedAt = new Date();
    }
    await db.update(orders).set(updates as any).where(eq(orders.id, orderId));
  }

  async updateOrderPagerCalled(orderId: number, pagerCalled: boolean) {
    await db.update(orders).set({ pagerCalled }).where(eq(orders.id, orderId));
  }

  // Menu Items
  async getMenuItems(locationId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.locationId, locationId))
      .orderBy(menuItems.sortOrder);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, id));
    return menuItem;
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db
      .insert(menuItems)
      .values(menuItem)
      .returning();
    return newMenuItem;
  }

  async updateMenuItem(
    id: number,
    updates: UpdateMenuItemRequest,
  ): Promise<MenuItem> {
    const [menuItem] = await db
      .update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, id))
      .returning();
    return menuItem;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async renameCategory(locationId: number, oldName: string, newName: string): Promise<number> {
    const result = await db
      .update(menuItems)
      .set({ category: newName })
      .where(and(eq(menuItems.locationId, locationId), eq(menuItems.category, oldName)))
      .returning({ id: menuItems.id });
    return result.length;
  }

  // Modifier Groups
  async getModifierGroups(locationId: number): Promise<ModifierGroup[]> {
    return await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.locationId, locationId));
  }

  async getModifierGroupsByMenuItem(
    menuItemId: number,
    locationId?: number,
  ): Promise<ModifierGroup[]> {
    const id = Number(menuItemId);
    // Groups attached via junction (shared groups) or legacy: menuItemId = this item
    const junctionRows = await db
      .select({ modifierGroupId: menuItemModifierGroups.modifierGroupId })
      .from(menuItemModifierGroups)
      .where(eq(menuItemModifierGroups.menuItemId, id));
    const attachedIds = junctionRows.map((r) => r.modifierGroupId);
    const conditions = [
      eq(modifierGroups.menuItemId, id),
      ...(attachedIds.length > 0 ? [inArray(modifierGroups.id, attachedIds)] : []),
    ];
    return await db
      .select()
      .from(modifierGroups)
      .where(or(...conditions));
  }

  async getModifierGroup(id: number): Promise<ModifierGroup | undefined> {
    const [group] = await db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.id, id));
    return group;
  }

  async createModifierGroup(
    group: InsertModifierGroup,
  ): Promise<ModifierGroup> {
    console.log(`[Storage] Creating modifier group with data:`, group);
    const [newGroup] = await db
      .insert(modifierGroups)
      .values(group)
      .returning();
    console.log(`[Storage] Modifier group created:`, newGroup);
    console.log("CREATED GROUP:", newGroup);
    return newGroup;
  }

  async updateModifierGroup(
    id: number,
    updates: UpdateModifierGroupRequest,
  ): Promise<ModifierGroup> {
    const setObj: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) setObj.name = updates.name;
    if (updates.sortOrder !== undefined) setObj.sortOrder = updates.sortOrder;
    if (updates.isActive !== undefined) setObj.isActive = updates.isActive;
    if (updates.isRequired !== undefined) setObj.isRequired = updates.isRequired;
    if (updates.dependsOnOptionId !== undefined) setObj.dependsOnOptionId = updates.dependsOnOptionId;
    if (updates.dependsOnGroupId !== undefined) setObj.dependsOnGroupId = updates.dependsOnGroupId;
    const [group] = await db
      .update(modifierGroups)
      .set(setObj as any)
      .where(eq(modifierGroups.id, id))
      .returning();
    return group;
  }

  async deleteModifierGroup(id: number): Promise<void> {
    await db.delete(menuItemModifierGroups).where(eq(menuItemModifierGroups.modifierGroupId, id));
    await db.delete(modifierOptions).where(eq(modifierOptions.modifierGroupId, id));
    await db.delete(modifierGroups).where(eq(modifierGroups.id, id));
  }

  async attachModifierGroupToItem(menuItemId: number, modifierGroupId: number): Promise<void> {
    await db.insert(menuItemModifierGroups).values({ menuItemId, modifierGroupId }).onConflictDoNothing();
  }

  async detachModifierGroupFromItem(menuItemId: number, modifierGroupId: number): Promise<void> {
    await db.delete(menuItemModifierGroups).where(and(eq(menuItemModifierGroups.menuItemId, menuItemId), eq(menuItemModifierGroups.modifierGroupId, modifierGroupId)));
    const [group] = await db.select().from(modifierGroups).where(eq(modifierGroups.id, modifierGroupId));
    if (group?.menuItemId === menuItemId) {
      await db.update(modifierGroups).set({ menuItemId: null, updatedAt: new Date() }).where(eq(modifierGroups.id, modifierGroupId));
    }
  }

  // Modifier Options
  async getModifierOptions(groupId: number): Promise<ModifierOption[]> {
    return await db
      .select()
      .from(modifierOptions)
      .where(eq(modifierOptions.modifierGroupId, groupId));
  }

  async getModifierOption(id: number): Promise<ModifierOption | undefined> {
    const [option] = await db
      .select()
      .from(modifierOptions)
      .where(eq(modifierOptions.id, id));
    return option;
  }

  async createModifierOption(
    option: InsertModifierOption,
  ): Promise<ModifierOption> {
    const [newOption] = await db
      .insert(modifierOptions)
      .values(option)
      .returning();
    return newOption;
  }

  async updateModifierOption(
    id: number,
    updates: UpdateModifierOptionRequest,
  ): Promise<ModifierOption> {
    const setObj: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) setObj.name = updates.name;
    if (updates.priceDelta !== undefined) setObj.priceDelta = updates.priceDelta;
    if (updates.sortOrder !== undefined) setObj.sortOrder = updates.sortOrder;
    if (updates.isDefault !== undefined) setObj.isDefault = updates.isDefault;
    if (updates.isActive !== undefined) setObj.isActive = updates.isActive;
    const [option] = await db
      .update(modifierOptions)
      .set(setObj as any)
      .where(eq(modifierOptions.id, id))
      .returning();
    return option;
  }

  async deleteModifierOption(id: number): Promise<void> {
    await db.delete(modifierOptions).where(eq(modifierOptions.id, id));
  }
}

export const storage = new DatabaseStorage();
