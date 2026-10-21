import type { NextFunction, Request, Response } from "express";

import { z } from "zod";

import {
  createOrder,
  deleteOrder,
  listOrders,
  listOrdersByStatus,
  searchOrders,
} from "./orders.service.js";
import {
  createOrderSchema,
  deleteOrderSchema,
  listOrdersByStatusSchema,
  listOrdersSchema,
  searchOrdersSchema,
} from "./orders.validation.js";

export async function deleteOrderController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = deleteOrderSchema.safeParse(req.params);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid order id",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const order = await deleteOrder(parsed.data);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    return res.status(200).json({
      message: "Order deleted",
      order,
    });
  } catch (error) {
    next(error);
  }
}

function buildPagination(
  total: number,
  page: number,
  limit: number,
) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function invalidQueryResponse(
  res: Response,
  error: z.ZodError,
) {
  return res.status(400).json({
    message: "Invalid query parameters",
    errors: error.flatten().fieldErrors,
  });
}

export async function listOrdersController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = listOrdersSchema.safeParse(req.query);

    if (!parsed.success) {
      return invalidQueryResponse(res, parsed.error);
    }

    const { orders, total } = await listOrders(parsed.data);

    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 20;

    return res.status(200).json({
      message: total > 0 ? "Orders fetched" : "No orders found",
      pagination: buildPagination(total, page, limit),
      orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function listOrdersByStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = listOrdersByStatusSchema.safeParse(req.query);

    if (!parsed.success) {
      return invalidQueryResponse(res, parsed.error);
    }

    const { orders, total } = await listOrdersByStatus(parsed.data);

    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 20;

    return res.status(200).json({
      message: total > 0 ? "Orders fetched" : "No orders found",
      pagination: buildPagination(total, page, limit),
      orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function searchOrdersController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = searchOrdersSchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid query parameters",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const orders = await searchOrders(parsed.data);

    return res.status(200).json({
      message: orders.length > 0 ? "Orders found" : "No orders found",
      count: orders.length,
      orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrderController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const parsed = createOrderSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid order payload",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const headerKey = req.headers["idempotency-key"];
    const headerValue = Array.isArray(headerKey) ? headerKey[0] : headerKey;
    const idempotencyKey =
      headerValue?.trim() || parsed.data.idempotencyKey?.trim();

    if (!idempotencyKey) {
      return res.status(400).json({
        message:
          "Missing idempotency key. Provide the 'Idempotency-Key' header or an idempotencyKey field.",
      });
    }

    const { order, replayed } = await createOrder({
      ...parsed.data,
      idempotencyKey,
    });

    return res.status(replayed ? 200 : 201).json({
      message: replayed
        ? "Order already exists for this idempotency key"
        : "Order created",
      order,
    });
  } catch (error) {
    next(error);
  }
}
