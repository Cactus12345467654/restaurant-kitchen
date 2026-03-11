/**
 * Cleanup: set image_url=NULL for menu_items still pointing to /uploads/... (files are gone).
 * Also clears leftover image_data column to save space.
 * Run: npx tsx script/cleanup-broken-urls.ts
 */
import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  const res = await pool.query(
    `UPDATE menu_items SET image_url = NULL WHERE image_url IS NOT NULL AND image_url NOT LIKE '/api/images/%'`
  );
  console.log("Cleared broken image_url for", res.rowCount, "rows");

  const res2 = await pool.query(
    `UPDATE menu_items SET image_data = NULL WHERE image_data IS NOT NULL`
  );
  console.log("Cleared leftover image_data for", res2.rowCount, "rows");

  const { rows } = await pool.query(
    `SELECT id, image_url FROM menu_items WHERE image_url IS NOT NULL ORDER BY id`
  );
  console.log("\nMenu items with images after cleanup:");
  for (const r of rows) {
    console.log("  id=" + r.id + "  url=" + r.image_url);
  }

  const { rows: uploaded } = await pool.query(
    "SELECT id, mime_type, length(data) as size FROM uploaded_images ORDER BY id"
  );
  console.log("\nUploaded images in DB:");
  for (const r of uploaded) {
    console.log("  id=" + r.id + "  mime=" + r.mime_type + "  size=" + (Number(r.size) / 1024).toFixed(0) + "KB");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
