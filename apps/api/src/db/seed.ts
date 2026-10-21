import bcrypt from "bcrypt";

import { closeDb, db, users } from "./index.js";

const SEED_USERS = [
  {
    name: "Admin User",
    email: "admin@orders.local",
    password: "Admin123!",
    role: "ADMIN",
  },
  {
    name: "Manager User",
    email: "manager@orders.local",
    password: "Manager123!",
    role: "MANAGER",
  },
  {
    name: "Regular User",
    email: "user@orders.local",
    password: "User123!",
    role: "USER",
  },
] as const;

async function runSeed(): Promise<void> {
  console.log("Seeding users...");

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await db
      .insert(users)
      .values({
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          name: user.name,
          passwordHash,
          role: user.role,
        },
      });

    console.log(`Seeded: ${user.email}`);
  }

  console.log("Users seeded successfully.");
}

runSeed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
