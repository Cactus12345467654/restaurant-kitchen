import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  locations,
  menuItems,
  modifierGroups,
  modifierOptions,
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
  
  // Locations
  getLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, updates: UpdateLocationRequest): Promise<Location>;
  
  // Menu Items
  getMenuItems(locationId: number): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: UpdateMenuItemRequest): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

  // Modifier Groups
  getModifierGroups(locationId: number): Promise<ModifierGroup[]>;
  getModifierGroupsByMenuItem(menuItemId: number): Promise<ModifierGroup[]>;
  getModifierGroup(id: number): Promise<ModifierGroup | undefined>;
  createModifierGroup(group: InsertModifierGroup): Promise<ModifierGroup>;
  updateModifierGroup(id: number, updates: UpdateModifierGroupRequest): Promise<ModifierGroup>;
  deleteModifierGroup(id: number): Promise<void>;

  // Modifier Options
  getModifierOptions(groupId: number): Promise<ModifierOption[]>;
  getModifierOption(id: number): Promise<ModifierOption | undefined>;
  createModifierOption(option: InsertModifierOption): Promise<ModifierOption>;
  updateModifierOption(id: number, updates: UpdateModifierOptionRequest): Promise<ModifierOption>;
  deleteModifierOption(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
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
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  // Locations
  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [newLocation] = await db.insert(locations).values(location).returning();
    return newLocation;
  }

  async updateLocation(id: number, updates: UpdateLocationRequest): Promise<Location> {
    const [location] = await db.update(locations).set(updates).where(eq(locations.id, id)).returning();
    return location;
  }

  // Menu Items
  async getMenuItems(locationId: number): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.locationId, locationId));
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return menuItem;
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db.insert(menuItems).values(menuItem).returning();
    return newMenuItem;
  }

  async updateMenuItem(id: number, updates: UpdateMenuItemRequest): Promise<MenuItem> {
    const [menuItem] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning();
    return menuItem;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  // Modifier Groups
  async getModifierGroups(locationId: number): Promise<ModifierGroup[]> {
    return await db.select().from(modifierGroups).where(eq(modifierGroups.locationId, locationId));
  }

  async getModifierGroupsByMenuItem(menuItemId: number): Promise<ModifierGroup[]> {
    return await db.select().from(modifierGroups).where(eq(modifierGroups.menuItemId, menuItemId));
  }

  async getModifierGroup(id: number): Promise<ModifierGroup | undefined> {
    const [group] = await db.select().from(modifierGroups).where(eq(modifierGroups.id, id));
    return group;
  }

  async createModifierGroup(group: InsertModifierGroup): Promise<ModifierGroup> {
    console.log(`[Storage] Creating modifier group with data:`, group);
    const [newGroup] = await db.insert(modifierGroups).values(group).returning();
    console.log(`[Storage] Modifier group created:`, newGroup);
    return newGroup;
  }

  async updateModifierGroup(id: number, updates: UpdateModifierGroupRequest): Promise<ModifierGroup> {
    const [group] = await db.update(modifierGroups).set({ ...updates, updatedAt: new Date() }).where(eq(modifierGroups.id, id)).returning();
    return group;
  }

  async deleteModifierGroup(id: number): Promise<void> {
    await db.delete(modifierGroups).where(eq(modifierGroups.id, id));
  }

  // Modifier Options
  async getModifierOptions(groupId: number): Promise<ModifierOption[]> {
    return await db.select().from(modifierOptions).where(eq(modifierOptions.modifierGroupId, groupId));
  }

  async getModifierOption(id: number): Promise<ModifierOption | undefined> {
    const [option] = await db.select().from(modifierOptions).where(eq(modifierOptions.id, id));
    return option;
  }

  async createModifierOption(option: InsertModifierOption): Promise<ModifierOption> {
    const [newOption] = await db.insert(modifierOptions).values(option).returning();
    return newOption;
  }

  async updateModifierOption(id: number, updates: UpdateModifierOptionRequest): Promise<ModifierOption> {
    const [option] = await db.update(modifierOptions).set({ ...updates, updatedAt: new Date() }).where(eq(modifierOptions.id, id)).returning();
    return option;
  }

  async deleteModifierOption(id: number): Promise<void> {
    await db.delete(modifierOptions).where(eq(modifierOptions.id, id));
  }
}

export const storage = new DatabaseStorage();
