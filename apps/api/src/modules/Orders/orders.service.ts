import { randomBytes } from "node:crypto";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from "drizzle-orm";

import { db, orders, orderItems } from "../../db/index.js";
import type { OrderRow } from "../../db/schema/order.js";
import type {
  CreateOrderInput,
  CreateOrderItemInput,
  DeleteOrderInput,
  ListOrdersByStatusInput,
  ListOrdersInput,
  SearchOrdersInput,
} from "./orders.validation.js";
import {
  orderSortDirections,
  orderSortFields,
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

export function resolveOrderTotal(items: CreateOrderItemInput[]): string {
  const total = items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unitPrice),
    0,
  );

  return total.toFixed(2);
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

  // The server recomputes the total from the line items whenever items are
  // provided, so the authoritative amount is never trusting the client.
  const amount = input.items ? resolveOrderTotal(input.items) : input.amount;

  const insertedOrder = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber: generateOrderNumber(),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        status: input.status,
        amount,
        currency: input.currency,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({ target: orders.idempotencyKey })
      .returning();

    if (order && input.items?.length) {
      await tx.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: order.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
    }

    return order ?? null;
  });

  if (insertedOrder) {
    return { order: insertedOrder, replayed: false };
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

export function orderSearchCondition(search: string): SQL | undefined {
  return or(
    ilike(orders.customerName, `%${search}%`),
    ilike(orders.customerEmail, `%${search}%`),
  );
}

export async function searchOrders(
  input: SearchOrdersInput,
): Promise<OrderRow[]> {
  return db
    .select()
    .from(orders)
    .where(orderSearchCondition(input.search))
    .orderBy(desc(orders.createdAt));
}

const orderSortColumns = {
  createdAt: orders.createdAt,
  amount: orders.amount,
} as const satisfies Record<(typeof orderSortFields)[number], unknown>;

type OrderSort = {
  by: (typeof orderSortFields)[number];
  direction: (typeof orderSortDirections)[number];
};

function orderSortExpression(sort: OrderSort) {
  const column = orderSortColumns[sort.by];

  if (!column) {
    return desc(orders.createdAt);
  }

  return sort.direction === "asc" ? asc(column) : desc(column);
}

function combineConditions(
  conditions: Array<SQL | undefined>,
): SQL | undefined {
  const defined = conditions.filter((condition) => condition != null);

  if (defined.length === 0) {
    return undefined;
  }

  return and(...defined);
}

type PagingParams = {
  page: number;
  limit: number;
  sort: OrderSort | null;
  conditions?: SQL | undefined;
};

async function fetchOrderPage({
  page,
  limit,
  sort,
  conditions,
}: PagingParams): Promise<{ orders: OrderRow[]; total: number }> {
  const offset = (page - 1) * limit;

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(conditions)
      .orderBy(
        sort ? orderSortExpression(sort) : desc(orders.createdAt),
      )
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(orders).where(conditions),
  ]);

  return { orders: rows, total: Number(totals?.value ?? 0) };
}

function resolveSort(
  input: { sortBy?: OrderSort["by"]; sortOrder?: OrderSort["direction"] },
): OrderSort | null {
  if (!input.sortBy) {
    return null;
  }

  return {
    by: input.sortBy,
    direction: input.sortOrder ?? "desc",
  };
}

export async function listOrders(
  input: ListOrdersInput,
): Promise<{ orders: OrderRow[]; total: number }> {
  return fetchOrderPage({
    page: input.page ?? 1,
    limit: input.limit ?? 20,
    sort: resolveSort(input),
    conditions: combineConditions([
      input.status ? eq(orders.status, input.status) : undefined,
      input.search ? orderSearchCondition(input.search) : undefined,
    ]),
  });
}

export async function listOrdersByStatus(
  input: ListOrdersByStatusInput,
): Promise<{ orders: OrderRow[]; total: number }> {
  return fetchOrderPage({
    page: input.page ?? 1,
    limit: input.limit ?? 20,
    sort: resolveSort(input),
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
