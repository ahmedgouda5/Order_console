import type { NextFunction, Request, Response } from "express";
import type { OrdersService } from "./orders.service.js";
import { createOrderSchema } from "./types/orders.schema.js";

export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawPage = req.query["page"];
      const page = rawPage !== undefined ? Number(rawPage) : 1;

      if (!Number.isInteger(page) || page < 1) {
        res.status(400).json({
          error: "Invalid page. Must be a positive integer.",
        });
        return;
      }

      const result = await this.ordersService.getOrders({ page });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  searchOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = req.query["q"];

      if (typeof q !== "string" || q.trim() === "") {
        res.status(400).json({
          error: "Missing or empty query param: q",
        });
        return;
      }

      const data = await this.ordersService.searchOrders({ query: q.trim() });
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  };

  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          errors: parsed.error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }

      const { order, created } = await this.ordersService.createOrder(
        parsed.data,
      );

      // 201 = freshly created, 200 = idempotent replay of existing order
      res.status(created ? 201 : 200).json({ order, created });
    } catch (err) {
      next(err);
    }
  };
}
