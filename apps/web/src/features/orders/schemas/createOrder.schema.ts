import { z } from "zod";

import { ORDER_STATUSES } from "../types/orders.types";

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
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .gt(0, "Amount must be greater than 0")
    .max(99_999_999, "Amount must be at most 99999999"),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code")
    .toUpperCase(),
});

export type CreateOrderFormValues = z.infer<typeof createOrderFormSchema>;
export type CreateOrderFields = {
  customerName: string;
  customerEmail: string;
  status: (typeof ORDER_STATUSES)[number];
  amount: string;
  currency: string;
};

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
