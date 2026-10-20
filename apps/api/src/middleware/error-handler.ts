import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const fields =
        (err.meta?.["target"] as string[] | undefined)?.join(", ") ?? "field";
      res.status(409).json({
        error: `Conflict: ${fields} already exists.`,
        code: "CONFLICT",
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        error: "Record not found.",
        code: "NOT_FOUND",
      });
      return;
    }
  }

  // ── Unexpected errors ────────────────────────────────────────────────────
  const isDev = process.env.NODE_ENV !== "production";
  const message = err instanceof Error ? err.message : "Internal server error";

  console.error("[Error]", err);

  res.status(500).json({
    error: "Internal server error.",
    ...(isDev && { detail: message }),
  });
}
