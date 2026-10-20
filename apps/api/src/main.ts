import "dotenv/config";
import helmet from "helmet";

import { createOrdersRouter } from "./modules/orders/orders.route.js";
import { globalErrorHandler } from "./middleware/error-handler.js";
import express from "express";
import { prisma } from "./config/index.js";

const port = Number(process.env.PORT ?? 4000);

const app = express();
app.use(helmet());
app.use(express.json({ limit: "50kb" }));

app.use("/api/orders", createOrdersRouter(prisma));
// app.use("/api/auth", createAuthRouter(prisma));

app.use(globalErrorHandler);

async function start() {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
