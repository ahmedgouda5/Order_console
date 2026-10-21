import type { Request, Response, NextFunction } from "express";

import { loginSchema } from "./auth.validation.js";
import { loginUser } from "./auth.service.js";

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

    return res.status(200).json(resultUser);
  } catch (error) {
    next(error);
  }
}
