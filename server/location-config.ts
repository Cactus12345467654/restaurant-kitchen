/**
 * Safe configuration synchronization for locations.
 * Uses "Cactus Burrito Bar" as the reference template.
 * Only adds missing keys - never overwrites existing values.
 */
import { db } from "./db";
import { locations } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { LocationConfig } from "@shared/schema";

/** Reference location name - used to resolve template (avoid hardcoding in runtime logic) */
const REFERENCE_LOCATION_NAME = "Cactus Burrito Bar";

/**
 * Default template configuration - baseline structure when reference is unavailable.
 * Mirrors the known-good setup of the reference location.
 */
const DEFAULT_TEMPLATE: LocationConfig = {
  defaultCategory: "Uncategorized",
  categoryOrder: [],
  pagerEnabled: false,
  pagerCount: 16,
  takeawayEnabled: true,
};

/**
 * Gets the configuration template from the reference location.
 * Falls back to DEFAULT_TEMPLATE if reference not found or has empty config.
 */
export async function getTemplateConfig(): Promise<LocationConfig> {
  const allLocations = await db.select().from(locations);
  const reference = allLocations.find(
    (loc) => loc.name?.toLowerCase() === REFERENCE_LOCATION_NAME.toLowerCase()
  );
  const raw = reference?.config;
  const refConfig =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as LocationConfig)
      : null;
  if (refConfig && Object.keys(refConfig).length > 0) {
    return { ...DEFAULT_TEMPLATE, ...refConfig };
  }
  return { ...DEFAULT_TEMPLATE };
}

/**
 * Merges template into target, adding only missing keys.
 * Never overwrites existing values.
 */
function mergeMissingOnly(
  target: LocationConfig,
  template: LocationConfig
): LocationConfig {
  const result = { ...target };
  let changed = false;
  for (const key of Object.keys(template)) {
    if (!(key in result) || result[key] === undefined) {
      result[key] = template[key];
      changed = true;
    }
  }
  return changed ? result : target;
}

/**
 * Syncs a location's config to match template structure.
 * Only adds missing keys - never overwrites existing values.
 */
export async function syncLocationConfig(locationId: number): Promise<boolean> {
  const [loc] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, locationId));
  if (!loc) return false;

  const template = await getTemplateConfig();
  const raw = loc.config;
  const current =
    raw != null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as LocationConfig)
      : {};
  const merged = mergeMissingOnly(current, template);

  if (JSON.stringify(merged) !== JSON.stringify(current)) {
    await db
      .update(locations)
      .set({ config: merged as object })
      .where(eq(locations.id, locationId));
    return true;
  }
  return false;
}

/**
 * Initializes a newly created location with the full template.
 * Used when creating new locations.
 */
export async function initNewLocationConfig(locationId: number): Promise<void> {
  const template = await getTemplateConfig();
  await db
    .update(locations)
    .set({ config: template as object })
    .where(eq(locations.id, locationId));
}

/**
 * Syncs all existing locations to match the template.
 * Only adds missing config keys - never overwrites.
 */
export async function syncAllLocationsToTemplate(): Promise<{
  synced: number;
  total: number;
  details: { id: number; name: string; changed: boolean }[];
}> {
  const allLocations = await db.select().from(locations);
  const template = await getTemplateConfig();
  const details: { id: number; name: string; changed: boolean }[] = [];
  let synced = 0;

  for (const loc of allLocations) {
    const raw = loc.config;
    const current =
      raw != null && typeof raw === "object" && !Array.isArray(raw)
        ? (raw as LocationConfig)
        : {};
    const merged = mergeMissingOnly(current, template);
    const changed = JSON.stringify(merged) !== JSON.stringify(current);

    if (changed) {
      await db
        .update(locations)
        .set({ config: merged as object })
        .where(eq(locations.id, loc.id));
      synced++;
    }
    details.push({ id: loc.id, name: loc.name ?? "Unknown", changed });
  }

  return { synced, total: allLocations.length, details };
}
