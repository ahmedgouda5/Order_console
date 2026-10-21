import { z } from "zod";

import {
  ORDER_STATUSES,
  type OrderStatus,
} from "../types/orders.types";

export type OrderItemFormValues = {
  name: string;
  quantity: string;
  unitPrice: string;
};

export type CreateOrderFields = {
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  currency: string;
  items: OrderItemFormValues[];
};

const orderItemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Item name is required")
    .max(150, "Item name must be at most 150 characters"),
  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(999, "Quantity must be at most 999"),
  unitPrice: z.coerce
    .number({ message: "Unit price must be a number" })
    .gt(0, "Unit price must be greater than 0")
    .max(999_999, "Unit price must be at most 999999"),
});

export const createOrderFormSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required")
    .max(150, "Customer name must be at most 150 characters"),
  customerEmail: z
    .string()
    .trim()
    .min(1, "Customer email is required")
    .max(255, "Customer email must be at most 255 characters")
    .email("Enter a valid email address"),
  status: z.enum(ORDER_STATUSES),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code")
    .toUpperCase(),
  items: z
    .array(orderItemFormSchema)
    .min(1, "Add at least one line item")
    .max(20, "An order can have at most 20 line items"),
});

export type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;

export function flattenZodIssues(
  error: z.ZodError<CreateOrderFormValues>,
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");

    if (!path) {
      continue;
    }

    fieldErrors[path] ??= [];
    fieldErrors[path]?.push(issue.message);
  }

  return fieldErrors;
}
