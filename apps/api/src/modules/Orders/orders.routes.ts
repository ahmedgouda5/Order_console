import { Router } from "express";

import {
  authenticateToken,
  requireRole,
} from "../../middlewares/auth.middleware.js";

import {
  createOrderController,
  deleteOrderController,
  listOrdersByStatusController,
  listOrdersController,
  searchOrdersController,
} from "./orders.controller.js";

const ordersRouter = Router();

ordersRouter.post("/", createOrderController);
ordersRouter.get("/", listOrdersController);
ordersRouter.get("/search", searchOrdersController);
ordersRouter.get("/status", listOrdersByStatusController);
ordersRouter.delete(
  "/:id",
  authenticateToken,
  requireRole("ADMIN"),
  deleteOrderController,
);

export default ordersRouter;
