import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.routes.js";
import ordersRouter from "./modules/orders/orders.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (_, res) => {
  res.json({ message: "hello world" });
});

app.use("/api/auth", authRouter);
app.use("/api/orders", ordersRouter);

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
