/**
 * Removes duplicate orders from Cactus Burrito Bar (yesterday + today).
 * Duplicates: same items, same totalPriceCents, createdAt within 10 seconds.
 * Keeps the first (lowest id), deletes the rest.
 *
 * Run: npx tsx script/remove-duplicate-orders.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { orders, locations } from "@shared/schema";

const DUPLICATE_WINDOW_SEC = 10;

function itemsKey(items: string[]): string {
  return JSON.stringify(items);
}

async function main() {
  // Find Cactus Burrito Bar location
  const allLocations = await db.select().from(locations);
  const cactusBar = allLocations.find(
    (l) => l.name.toLowerCase().includes("cactus burrito bar") || l.name === "Cactus Burrito Bar"
  );
  if (!cactusBar) {
    console.log("Cactus Burrito Bar location not found. Available locations:");
    allLocations.forEach((l) => console.log(`  - id=${l.id}: ${l.name}`));
    process.exit(1);
  }
  const locationId = cactusBar.id;
  console.log(`Found: ${cactusBar.name} (id=${locationId})`);

  // Yesterday 00:00 and today 23:59:59 (local time)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.locationId, locationId),
        gte(orders.createdAt, yesterdayStart),
        lte(orders.createdAt, now)
      )
    )
    .orderBy(asc(orders.createdAt), asc(orders.id));

  console.log(`Orders in range (yesterday + today): ${rows.length}`);

  // Group potential duplicates: same items, same totalPriceCents, createdAt within DUPLICATE_WINDOW_SEC
  const toDelete: number[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const o = rows[i];
    const key = `${itemsKey(o.items)}|${o.totalPriceCents ?? "null"}`;

    // Find all orders in same "cluster" (same key, within time window)
    const cluster: typeof rows = [];
    for (let j = 0; j < rows.length; j++) {
      const other = rows[j];
      if (itemsKey(other.items) !== itemsKey(o.items)) continue;
      if ((other.totalPriceCents ?? null) !== (o.totalPriceCents ?? null)) continue;
      const diffMs = Math.abs(
        (new Date(o.createdAt!).getTime() - new Date(other.createdAt!).getTime())
      );
      if (diffMs <= DUPLICATE_WINDOW_SEC * 1000) {
        cluster.push(other);
      }
    }

    if (cluster.length <= 1) continue;

    // Keep lowest id, mark rest for deletion
    cluster.sort((a, b) => a.id - b.id);
    const keepId = cluster[0].id;
    const clusterKey = `${key}|${keepId}`;
    if (seen.has(clusterKey)) continue; // already processed this cluster
    seen.add(clusterKey);

    for (let k = 1; k < cluster.length; k++) {
      toDelete.push(cluster[k].id);
    }
  }

  // Dedupe toDelete (same id might appear in overlapping clusters)
  const idsToDelete = [...new Set(toDelete)];

  if (idsToDelete.length === 0) {
    console.log("No duplicate orders found.");
    return;
  }

  console.log(`Found ${idsToDelete.length} duplicate order(s) to remove (ids: ${idsToDelete.join(", ")})`);
  for (const id of idsToDelete) {
    await db.delete(orders).where(eq(orders.id, id));
    console.log(`  Deleted order id=${id}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
