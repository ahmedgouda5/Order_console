import { z } from "zod";

export const orderStatusValues = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(150),
  customerEmail: z.string().trim().email().max(255),
  status: z.enum(orderStatusValues).default("PENDING"),
  amount: z.coerce
    .number()
    .gt(0)
    .max(99_999_999)
    .transform((value) => value.toFixed(2)),
  currency: z.string().trim().length(3).toUpperCase().default("USD"),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListOrdersInput = z.infer<typeof listOrdersSchema>;

export const listOrdersByStatusSchema = z.object({
  status: z.enum(orderStatusValues),
  page: z.coerce.number().int().min(1).max(1_000_000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type ListOrdersByStatusInput = z.infer<
  typeof listOrdersByStatusSchema
>;

export type ListOrdersInput = z.infer<typeof listOrdersSchema>;

export const searchOrdersSchema = z.object({
  search: z.string().trim().min(1).max(150),
});

export type SearchOrdersInput = z.infer<typeof searchOrdersSchema>;

export const deleteOrderSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteOrderInput = z.infer<typeof deleteOrderSchema>;
