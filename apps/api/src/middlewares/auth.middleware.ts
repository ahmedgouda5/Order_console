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

const AUTH_COOKIE_NAME = "token";

function readAuthCookie(req: Request): string | null {
  const cookieHeader = Array.isArray(req.headers.cookie)
    ? req.headers.cookie[0]
    : req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const name = part.slice(0, separator).trim();

    if (name !== AUTH_COOKIE_NAME) {
      continue;
    }

    const value = part.slice(separator + 1).trim();

    return value ? decodeURIComponent(value) : null;
  }

  return null;
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = readAuthCookie(req);

  if (!token) {
    return res.status(401).json({
      message: "Missing authentication token cookie.",
    });
  }

  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({
      message: "Invalid or expired token cookie.",
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
