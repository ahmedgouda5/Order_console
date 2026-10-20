import { Prisma, type PrismaClient, type OrderStatus } from "@prisma/client";
import type {
  GetOrdersParams,
  GetOrdersResult,
  SearchOrdersParams,
  SearchOrdersResult,
  CreateOrderInput,
  CreateOrderResult,
} from "./types/orders.types.js";

const PAGE_SIZE = 10;
const SEARCH_LIMIT = 100;

const VALID_STATUSES = new Set<string>([
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

function toOrderStatus(raw: string): OrderStatus | null {
  const upper = raw.trim().toUpperCase();
  return VALID_STATUSES.has(upper) ? (upper as OrderStatus) : null;
}

export class OrdersService {
  constructor(private readonly prisma: PrismaClient) {}

  // ! get all orders by pagination
  async getOrders({ page }: GetOrdersParams): Promise<GetOrdersResult> {
    const skip = (page - 1) * PAGE_SIZE;

    const [total, data] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.findMany({
        skip,
        take: PAGE_SIZE,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    };
  }

  // ! search orders
  async searchOrders({
    query,
  }: SearchOrdersParams): Promise<SearchOrdersResult> {
    const statusMatch = toOrderStatus(query);

    return this.prisma.order.findMany({
      where: {
        OR: [
          {
            customerName: {
              contains: query,
              mode: "insensitive",
            },
          },
          ...(statusMatch ? [{ status: statusMatch }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: SEARCH_LIMIT,
    });
  }

  // ! create order — idempotent via ON CONFLICT DO NOTHING
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const {
      orderNumber,
      customerName,
      customerEmail,
      status = "PENDING",
      amount,
      currency = "USD",
      idempotencyKey,
    } = input;

    const id = crypto.randomUUID();

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      INSERT INTO "Order" (id, "orderNumber", "customerName", "customerEmail",
                           status, amount, currency, "idempotencyKey",
                           "createdAt", "updatedAt")
      VALUES (
        ${id},
        ${orderNumber},
        ${customerName},
        ${customerEmail},
        ${status}::"OrderStatus",
        ${amount}::numeric,
        ${currency},
        ${idempotencyKey},
        NOW(),
        NOW()
      )
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING id
    `);

    const created = rows.length > 0;

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { idempotencyKey },
    });

    return { order, created };
  }
}
