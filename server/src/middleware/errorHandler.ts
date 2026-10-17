import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";
import { sendError } from "../utils/response";

// 404 handler — jab koi route match nahi hota
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// Centralized error handler — saari expected aur unexpected errors yahan aati hain
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // If it's our custom AppError
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  // Handle syntax error (e.g. malformed JSON body)
  if (err instanceof SyntaxError && "status" in err && (err as any).status === 400) {
    return sendError(res, "Malformed JSON in request body", 400);
  }

  // Handle body size limit exceeded
  if (err.type === "entity.too.large") {
    return sendError(res, "Request payload too large (max 1MB)", 413);
  }

  // Unexpected / unhandled errors
  console.error("💥 Unhandled error:", err);

  const isProduction = process.env.NODE_ENV === "production";
  const message = isProduction ? "Internal server error" : (err.message || "Internal server error");

  return sendError(res, message, 500);
}
