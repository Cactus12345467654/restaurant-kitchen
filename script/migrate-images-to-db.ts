/**
 * Migration: move all old menu_item images into the uploaded_images table.
 *
 * Sources (checked in priority order):
 *   1. menu_items.image_data  — base64 data-url already in the DB
 *   2. local uploads/ file    — read file referenced by /uploads/<name> imageUrl
 *
 * After migrating each image the script:
 *   - inserts a row in uploaded_images
 *   - sets  menu_items.image_url = /api/images/<new_id>
 *   - clears menu_items.image_data to NULL
 *
 * Safe to run multiple times: items that already have /api/images/ urls are skipped.
 *
 * Run:  npx tsx script/migrate-images-to-db.ts
 */
import "dotenv/config";
import path from "path";
import fs from "fs";
import { pool } from "../server/db";

const uploadsDir = path.join(process.cwd(), "uploads");

interface MenuRow {
  id: number;
  image_url: string | null;
  image_data: string | null;
}

function mimeFromExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

function extractMimeFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);/);
  return m ? m[1] : "image/jpeg";
}

async function main() {
  console.log("=== Image migration start ===\n");

  const { rows } = await pool.query<MenuRow>(
    `SELECT id, image_url, image_data FROM menu_items ORDER BY id`
  );
  console.log(`Total menu_items: ${rows.length}`);

  let migrated = 0;
  let skipped = 0;
  let noData = 0;

  for (const row of rows) {
    const { id, image_url, image_data } = row;

    if (!image_url && !image_data) {
      skipped++;
      continue;
    }

    if (image_url?.startsWith("/api/images/")) {
      console.log(`  [SKIP] id=${id} — already migrated (${image_url})`);
      skipped++;
      continue;
    }

    let dataUrl: string | null = null;

    // Priority 1: image_data column (base64 data-url)
    if (image_data && image_data.startsWith("data:")) {
      dataUrl = image_data;
      console.log(`  [SRC:imageData] id=${id} — using image_data column (${(dataUrl.length / 1024).toFixed(0)} KB)`);
    }

    // Priority 2: local file from /uploads/...
    if (!dataUrl && image_url?.startsWith("/uploads/")) {
      const filename = image_url.replace("/uploads/", "");
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        const buf = fs.readFileSync(filePath);
        const mime = mimeFromExt(filename);
        dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
        console.log(`  [SRC:file] id=${id} — read from ${filePath} (${(buf.length / 1024).toFixed(0)} KB)`);
      } else {
        console.log(`  [MISS] id=${id} — file not found: ${filePath}`);
      }
    }

    // Priority 3: image_data that is raw base64 without data: prefix
    if (!dataUrl && image_data && !image_data.startsWith("data:") && image_data.length > 100) {
      dataUrl = `data:image/jpeg;base64,${image_data}`;
      console.log(`  [SRC:rawBase64] id=${id} — raw base64 in image_data (${(image_data.length / 1024).toFixed(0)} KB)`);
    }

    if (!dataUrl) {
      console.log(`  [NO DATA] id=${id} — image_url="${image_url}" — no recoverable image data`);
      noData++;
      continue;
    }

    const mime = extractMimeFromDataUrl(dataUrl);

    const insertRes = await pool.query(
      `INSERT INTO uploaded_images (data, mime_type) VALUES ($1, $2) RETURNING id`,
      [dataUrl, mime]
    );
    const newImageId = insertRes.rows[0].id;
    const newUrl = `/api/images/${newImageId}`;

    await pool.query(
      `UPDATE menu_items SET image_url = $1, image_data = NULL WHERE id = $2`,
      [newUrl, id]
    );

    console.log(`  [OK] id=${id} — migrated → ${newUrl}`);
    migrated++;
  }

  console.log(`\n=== Migration complete ===`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already ok / no image): ${skipped}`);
  console.log(`  No recoverable data: ${noData}`);

  // Verify: count items still pointing to old urls
  const { rows: remaining } = await pool.query(
    `SELECT id, image_url FROM menu_items
     WHERE image_url IS NOT NULL
       AND image_url NOT LIKE '/api/images/%'`
  );
  if (remaining.length > 0) {
    console.log(`\n  WARNING: ${remaining.length} items still have non-migrated image_url:`);
    for (const r of remaining) {
      console.log(`    id=${r.id}  url=${r.image_url}`);
    }
  } else {
    console.log(`\n  All menu_items with images now use /api/images/ URLs.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
