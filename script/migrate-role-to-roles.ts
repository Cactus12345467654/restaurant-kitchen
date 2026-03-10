/**
 * Migrates users table from role (text) to roles (text[]).
 * Run: npx tsx script/migrate-role-to-roles.ts
 */
import "dotenv/config";
import { pool } from "../server/db";

async function migrate() {
  const client = await pool.connect();
  try {
    // Check if old role column exists
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('role', 'roles')
    `);
    const hasRole = colCheck.rows.some((r: any) => r.column_name === "role");
    const hasRoles = colCheck.rows.some((r: any) => r.column_name === "roles");

    if (!hasRole && hasRoles) {
      console.log("Migration already applied (roles column exists, role does not).");
      return;
    }

    if (!hasRole) {
      console.log("Neither role nor roles column found. Schema may be in unexpected state.");
      return;
    }

    console.log("Migrating role -> roles...");

    if (!hasRoles) {
      await client.query(`ALTER TABLE users ADD COLUMN roles text[] DEFAULT '{}'`);
    }
    await client.query(`UPDATE users SET roles = ARRAY[role]::text[] WHERE roles IS NULL OR array_length(roles, 1) IS NULL`);
    await client.query(`ALTER TABLE users ALTER COLUMN roles SET NOT NULL`);
    await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS role`);

    console.log("Migration complete.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
