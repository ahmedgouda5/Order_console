import { randomBytes } from "node:crypto";

import {
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from "drizzle-orm";

import { db, orders } from "../../db/index.js";
import type { OrderRow } from "../../db/schema/order.js";
import type {
  CreateOrderInput,
  DeleteOrderInput,
  ListOrdersByStatusInput,
  ListOrdersInput,
  SearchOrdersInput,
} from "./orders.validation.js";

function generateOrderNumber(): string {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const random = randomBytes(4).toString("hex").toUpperCase();

  return `ORD-${stamp}-${random}`;
}

export async function createOrder(
  input: CreateOrderInput & { idempotencyKey: string },
): Promise<{ order: OrderRow; replayed: boolean }> {
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (existing) {
    return { order: existing, replayed: true };
  }

  const injected = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      status: input.status,
      amount: input.amount,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
    })
    .onConflictDoNothing({ target: orders.idempotencyKey })
    .returning();

  if (injected[0]) {
    return { order: injected[0], replayed: false };
  }

  const [raced] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, input.idempotencyKey))
    .limit(1);

  if (!raced) {
    throw new Error(
      `Order with idempotency key "${input.idempotencyKey}" was not found after insert conflict`,
    );
  }

  return { order: raced, replayed: true };
}

export async function searchOrders(
  input: SearchOrdersInput,
): Promise<OrderRow[]> {
  return db
    .select()
    .from(orders)
    .where(
      or(
        ilike(orders.customerName, `%${input.search}%`),
        ilike(orders.customerEmail, `%${input.search}%`),
      ),
    )
    .orderBy(desc(orders.createdAt));
}

type PagingParams = {
  page: number;
  limit: number;
  conditions?: SQL | undefined;
};

async function fetchOrderPage({
  page,
  limit,
  conditions,
}: PagingParams): Promise<{ orders: OrderRow[]; total: number }> {
  const offset = (page - 1) * limit;

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(conditions)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(orders).where(conditions),
  ]);

  return { orders: rows, total: Number(totals?.value ?? 0) };
}

export async function listOrders(
  input: ListOrdersInput,
): Promise<{ orders: OrderRow[]; total: number }> {
  return fetchOrderPage({
    page: input.page ?? 1,
    limit: input.limit ?? 20,
  });
}

export async function listOrdersByStatus(
  input: ListOrdersByStatusInput,
): Promise<{ orders: OrderRow[]; total: number }> {
  return fetchOrderPage({
    page: input.page ?? 1,
    limit: input.limit ?? 20,
    conditions: eq(orders.status, input.status),
  });
}

export async function deleteOrder(
  input: DeleteOrderInput,
): Promise<OrderRow | null> {
  const [deleted] = await db
    .delete(orders)
    .where(eq(orders.id, input.id))
    .returning();

  return deleted ?? null;
}
