import { http } from "../../../lib/http";
import type {
  CreatedOrderResponse,
  OrdersPage,
  OrdersQueryParams,
} from "../types/orders.types";

export function buildOrdersQueryString(params: OrdersQueryParams): string {
  const query = new URLSearchParams();

  query.set("page", String(params.page));
  query.set("limit", "20");

  if (params.search) {
    query.set("search", params.search);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.sortBy !== "createdAt" || params.sortOrder !== "desc") {
    query.set("sortBy", params.sortBy);
    query.set("sortOrder", params.sortOrder);
  }

  return query.toString();
}

export async function listOrders(
  params: OrdersQueryParams,
  signal?: AbortSignal,
): Promise<OrdersPage> {
  return http<OrdersPage>(
    `/api/orders?${buildOrdersQueryString(params)}`,
    { signal },
  );
}

export type CreateOrderPayload = {
  customerName: string;
  customerEmail: string;
  status: string;
  amount: string;
  currency: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
  }>;
};

export async function createOrder(
  payload: CreateOrderPayload & { idempotencyKey: string },
  signal?: AbortSignal,
): Promise<CreatedOrderResponse> {
  return http<CreatedOrderResponse>("/api/orders", {
    method: "POST",
    body: payload,
    signal,
    headers: { "Idempotency-Key": payload.idempotencyKey },
  });
}
