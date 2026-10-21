import type { Request, Response, NextFunction } from "express";

import {
  authenticateToken,
} from "../../middlewares/auth.middleware.js";

import { loginSchema } from "./auth.validation.js";
import {
  getCurrentUser,
  loginUser,
} from "./auth.service.js";

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid email or password format",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const resultUser = await loginUser(result.data);

    if (!resultUser) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    res.cookie("token", resultUser.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      user: resultUser.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function meController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = await getCurrentUser(req.user?.id ?? "");

    if (!user) {
      return res.status(401).json({
        message: "Authenticated user not found.",
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.clearCookie("token", { path: "/" });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
