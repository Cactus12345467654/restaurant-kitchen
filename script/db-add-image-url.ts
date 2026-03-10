/**
 * One-off: add image_url column to menu_items if missing.
 * Run: npx tsx script/db-add-image-url.ts
 * Safe to run multiple times (IF NOT EXISTS).
 */
import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  await pool.query(`
    ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);
  console.log("Done. menu_items.image_url exists.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
