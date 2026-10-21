import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRouter from "./modules/auth/auth.routes.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

app.use("/", (_, res) => {
  res.status(200).json({ message: "OK" });
});

app.use("/api/auth", authRouter);

app.listen(4000, () => {
  console.log("Server is running on port 4000");
});
