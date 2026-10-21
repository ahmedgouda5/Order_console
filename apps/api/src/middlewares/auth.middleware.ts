import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { userRoleEnum } from "../db/schema/user.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters");
}

export type UserRole = (typeof userRoleEnum.enumValues)[number];

export type AuthUser = {
  id: string;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (typeof decoded === "string" || !decoded.sub) {
      return null;
    }

    return {
      id: decoded.sub,
      role: decoded.role as UserRole,
    };
  } catch {
    return null;
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers["authorization"];
  const headerValue = Array.isArray(header) ? header[0] : header;

  if (!headerValue) {
    return res.status(401).json({
      message: "Missing Authorization header. Provide 'Bearer <token>'.",
    });
  }

  const [scheme, ...rest] = headerValue.trim().split(" ");
  const token =
    scheme.toLowerCase() === "bearer" ? rest.join(" ").trim() : scheme;

  if (!token) {
    return res.status(401).json({
      message: "Invalid Authorization header format.",
    });
  }

  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }

  req.user = user;

  return next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Authentication required before role check.",
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        message: `Access denied. Allowed roles: ${roles.join(", ")}.`,
      });
    }

    return next();
  };
}
