import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { loadEnv } from "./env.js";
import { orders, orderItems } from "./schema/order.js";
import { users } from "./schema/user.js";

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to apps/api/.env (see apps/api/.env.example).",
  );
}

export const pool = new Pool({ connectionString });

export const db = drizzle({
  client: pool,
  schema: { users, orders, orderItems },
});

export { users, orders, orderItems };

export async function closeDb(): Promise<void> {
  await pool.end();
}
