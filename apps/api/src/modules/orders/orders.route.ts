import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { OrdersService } from "./orders.service.js";
import { OrdersController } from "./orders.controller.js";

export function createOrdersRouter(prisma: PrismaClient): Router {
  const router = Router();

  const service = new OrdersService(prisma);
  const controller = new OrdersController(service);

  router.get("/search", controller.searchOrders);
  router.get("/", controller.getAllOrders);
  router.post("/", controller.createOrder);

  return router;
}
