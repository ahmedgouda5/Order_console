import "dotenv/config";

import { faker } from "@faker-js/faker";
import { PrismaClient, type OrderStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

const SEED_COUNT = 20_000;

// Postgres has a max of ~65k parameters per query.
// Each order row has 9 fields → 500 rows × 9 = 4,500 params — well within limits.
const BATCH_SIZE = 500;

export async function runSeed(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("🗑️  Clearing existing orders...");
    await prisma.order.deleteMany();

    console.log(`⚙️  Generating ${SEED_COUNT.toLocaleString()} orders in batches of ${BATCH_SIZE}...`);

    let totalInserted = 0;
    const batches = Math.ceil(SEED_COUNT / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, SEED_COUNT);

      const orders = Array.from(
        { length: batchEnd - batchStart },
        (_, i) => {
          const globalIndex = batchStart + i + 1;
          const createdAt = faker.date.between({
            from: "2025-01-01T00:00:00.000Z",
            to: new Date(),
          });

          return {
            orderNumber: `ORD-${faker.string.alphanumeric(8).toUpperCase()}-${globalIndex}`,
            customerName: faker.person.fullName(),
            customerEmail: faker.internet.email().toLowerCase(),
            status: faker.helpers.arrayElement(ORDER_STATUSES),
            amount: faker.number.float({ min: 10, max: 5000, fractionDigits: 2 }),
            currency: faker.helpers.arrayElement(CURRENCIES),
            idempotencyKey: `seed-${crypto.randomUUID()}`,
            createdAt,
            updatedAt: createdAt,
          };
        },
      );

      const result = await prisma.order.createMany({ data: orders });
      totalInserted += result.count;

      console.log(
        `   Batch ${batchIndex + 1}/${batches} → inserted ${result.count} rows (total: ${totalInserted.toLocaleString()})`,
      );
    }

    console.log(`\n✅ Done! Seeded ${totalInserted.toLocaleString()} orders.`);
  } finally {
    await prisma.$disconnect();
  }
}

