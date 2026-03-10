import "dotenv/config";
import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";

async function main() {
  const email = "unisolo@inbox.lv";
  const password = "BrioAdmin123!";

  const users = await storage.getUsers();
  const existing = users.find((u) => u.username === email);

  if (existing) {
    console.log(`Admin user with email ${email} already exists (id=${existing.id}).`);
    return;
  }

  const hashed = await hashPassword(password);
  const user = await storage.createUser({
    username: email,
    password: hashed,
    roles: ["super_admin"],
    isActive: true,
  } as any);

  console.log("First admin user created:");
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  id: ${user.id}`);
}

main().catch((err) => {
  console.error("Failed to create first admin user:", err);
  process.exit(1);
});

