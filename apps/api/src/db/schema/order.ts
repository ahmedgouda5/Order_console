import {
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),

  orderNumber: varchar("order_number", { length: 64 }).notNull().unique(),

  customerName: varchar("customer_name", { length: 150 }).notNull(),

  customerEmail: varchar("customer_email", { length: 255 }).notNull(),

  status: orderStatusEnum("status").notNull().default("PENDING"),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

  currency: varchar("currency", { length: 3 }).notNull().default("USD"),

  idempotencyKey: varchar("idempotency_key", { length: 128 })
    .notNull()
    .unique(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type OrderRow = typeof orders.$inferSelect;
