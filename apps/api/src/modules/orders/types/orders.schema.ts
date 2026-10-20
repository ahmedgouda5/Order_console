import { z } from "zod";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

export const createOrderSchema = z.object({
  orderNumber: z.string().trim().min(1, "orderNumber is required"),

  customerName: z.string().trim().min(1, "customerName is required"),

  customerEmail: z
    .string()
    .trim()
    .email("customerEmail must be a valid email address"),

  status: z.enum(ORDER_STATUSES).optional().default("PENDING"),

  amount: z
    .number({ error: "amount must be a number" })
    .positive("amount must be greater than 0")
    .finite("amount must be a finite number"),

  currency: z
    .string()
    .trim()
    .length(3, "currency must be a 3-character ISO code (e.g. USD)")
    .toUpperCase()
    .optional()
    .default("USD"),

  idempotencyKey: z.string().trim().min(1, "idempotencyKey is required"),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;
