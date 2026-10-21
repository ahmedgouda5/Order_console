import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

import {
  closeDb,
  db,
  orders,
  orderItems,
  users,
} from "./index.js";
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
  {
    name: "Agent User",
    email: "agent@orders.local",
    password: "Agent123!",
    role: "AGENT",
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

type ItemSeed = {
  orderNumber: string;
  name: string;
  quantity: number;
  unitPrice: string;
};

type OrderWithItems = { order: OrderSeed; items: ItemSeed[] };

function buildOrderWithItems(sequence: number): OrderWithItems {
  const orderNumber = `ORD-${String(sequence).padStart(6, "0")}`;
  const createdAt = faker.date.past({ years: 1 });

  // 1 to 5 line items per order; total amount is the sum of item lines
  // so the stored amount always matches the persisted items.
  const itemCount = faker.number.int({ min: 1, max: 5 });
  const items: ItemSeed[] = Array.from({ length: itemCount }, () => ({
    orderNumber,
    name: faker.commerce.productName().slice(0, 150),
    quantity: faker.number.int({ min: 1, max: 5 }),
    unitPrice: faker.commerce.price({ min: 1, max: 5_000, dec: 2 }),
  }));

  const total = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0,
  );

  const order: OrderSeed = {
    orderNumber,
    customerName: faker.person.fullName(),
    customerEmail: faker.internet.email().toLowerCase(),
    status: faker.helpers.arrayElement(orderStatusValues),
    amount: total.toFixed(2),
    currency: faker.helpers.arrayElement(CURRENCIES),
    idempotencyKey: faker.string.uuid(),
    createdAt,
    updatedAt: faker.date.soon({
      days: faker.number.int({ min: 1, max: 30 }),
      refDate: createdAt,
    }),
  };

  return { order, items };
}

function buildOrderBatch(batchIndex: number, batchSize: number): {
  orders: OrderSeed[];
  items: ItemSeed[];
} {
  const orders: OrderSeed[] = [];
  const items: ItemSeed[] = [];

  for (let i = 0; i < batchSize; i++) {
    const { order, items: orderItems } = buildOrderWithItems(
      batchIndex * batchSize + i + 1,
    );

    orders.push(order);
    items.push(...orderItems);
  }

  return { orders, items };
}

async function seedOrders(): Promise<void> {
  console.log(`Seeding ${TOTAL_ORDERS.toLocaleString()} orders with 1–5 line items each...`);

  await db.execute(
    sql`TRUNCATE TABLE ${orderItems}, ${orders}`,
  );

  let totalItems = 0;

  for (
    let batchIndex = 0;
    batchIndex * ORDER_BATCH_SIZE < TOTAL_ORDERS;
    batchIndex++
  ) {
    const batchSize = Math.min(
      ORDER_BATCH_SIZE,
      TOTAL_ORDERS - batchIndex * ORDER_BATCH_SIZE,
    );
    const { orders: orderRows, items: itemRows } = buildOrderBatch(
      batchIndex,
      batchSize,
    );

    // INSERT ... RETURNING preserves the VALUES order, so row N corresponds
    // to orderRows[N]; we use that to link line items in one batch insert.
    const inserted = await db
      .insert(orders)
      .values(orderRows)
      .returning({ id: orders.id, orderNumber: orders.orderNumber });

    const idByOrderNumber = new Map(
      inserted.map((row) => [row.orderNumber, row.id]),
    );

    await db.insert(orderItems).values(
      itemRows.map((item) => ({
        orderId: idByOrderNumber.get(item.orderNumber)!,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    );

    totalItems += itemRows.length;

    console.log(
      `Seeded orders: ${(batchIndex * ORDER_BATCH_SIZE + batchSize).toLocaleString()} / ${TOTAL_ORDERS.toLocaleString()} (line items so far: ${totalItems.toLocaleString()})`,
    );
  }

  console.log(
    `Orders seeded successfully. Total line items: ${totalItems.toLocaleString()}`,
  );
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
