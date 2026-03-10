/**
 * Syncs all existing locations to match the reference template (Cactus Burrito Bar).
 * Only adds missing config keys - never overwrites existing values.
 *
 * Run: npx tsx script/sync-location-config.ts
 */
import "dotenv/config";
import { syncAllLocationsToTemplate } from "../server/location-config";

async function main() {
  console.log("Syncing location configurations to template...");
  const result = await syncAllLocationsToTemplate();
  console.log(`Done. Synced ${result.synced} of ${result.total} locations.`);
  for (const d of result.details) {
    console.log(`  - ${d.name} (id=${d.id}): ${d.changed ? "updated" : "unchanged"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
