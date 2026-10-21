import { Router } from "express";

import { authenticateToken } from "../../middlewares/auth.middleware.js";

import {
  loginController,
  logoutController,
  meController,
} from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.get("/me", authenticateToken, meController);
authRouter.post("/logout", logoutController);

export default authRouter;
