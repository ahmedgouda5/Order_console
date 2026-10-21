import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

import { closeDb, db, orders, users } from "./index.js";
import { orderStatusValues } from "../modules/Orders/orders.validation.js";

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

const TOTAL_ORDERS = 50_000;
const ORDER_BATCH_SIZE = 2_000;
const CURRENCIES = ["USD", "EUR", "GBP", "SAR", "AED"] as const;

type OrderSeed = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: (typeof orderStatusValues)[number];
  amount: string;
  currency: string;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
};

function buildOrderBatch(batchIndex: number, batchSize: number): OrderSeed[] {
  const batch: OrderSeed[] = [];

  for (let i = 0; i < batchSize; i++) {
    const sequence = batchIndex * batchSize + i + 1;
    const orderNumber = `ORD-${String(sequence).padStart(6, "0")}`;
    const createdAt = faker.date.past({ years: 1 });

    batch.push({
      orderNumber,
      customerName: faker.person.fullName(),
      customerEmail: faker.internet.email().toLowerCase(),
      status: faker.helpers.arrayElement(orderStatusValues),
      amount: faker.commerce.price({ min: 1, max: 99_999, dec: 2 }),
      currency: faker.helpers.arrayElement(CURRENCIES),
      idempotencyKey: faker.string.uuid(),
      createdAt,
      updatedAt: faker.date.soon({
        days: faker.number.int({ min: 1, max: 30 }),
        refDate: createdAt,
      }),
    });
  }

  return batch;
}

async function seedOrders(): Promise<void> {
  console.log(`Seeding ${TOTAL_ORDERS.toLocaleString()} orders...`);

  await db.execute(sql`TRUNCATE TABLE ${orders}`);

  for (
    let batchIndex = 0;
    batchIndex * ORDER_BATCH_SIZE < TOTAL_ORDERS;
    batchIndex++
  ) {
    const batchSize = Math.min(
      ORDER_BATCH_SIZE,
      TOTAL_ORDERS - batchIndex * ORDER_BATCH_SIZE,
    );
    const batch = buildOrderBatch(batchIndex, batchSize);

    await db.insert(orders).values(batch);
    console.log(
      `Seeded orders: ${(batchIndex * ORDER_BATCH_SIZE + batchSize).toLocaleString()} / ${TOTAL_ORDERS.toLocaleString()}`,
    );
  }

  console.log("Orders seeded successfully.");
}

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

  await seedOrders();
}

runSeed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
