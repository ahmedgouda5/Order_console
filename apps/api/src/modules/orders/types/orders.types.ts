import type { PrismaClient, OrderStatus } from "@prisma/client";

export interface GetOrdersParams {
  page: number;
}

export interface GetOrdersResult {
  data: Awaited<ReturnType<PrismaClient["order"]["findMany"]>>;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SearchOrdersParams {
  query: string;
}

export type SearchOrdersResult = Awaited<
  ReturnType<PrismaClient["order"]["findMany"]>
>;

export interface CreateOrderInput {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status?: OrderStatus;
  amount: number;
  currency?: string;
  idempotencyKey: string;
}

export interface CreateOrderResult {
  order: Awaited<ReturnType<PrismaClient["order"]["findUniqueOrThrow"]>>;
  created: boolean;
}
