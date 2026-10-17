import { Request, Response, NextFunction } from "express";

// 404 handler — jab koi route match nahi hota
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// Centralized error handler — saari unexpected errors yahan aati hain
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("💥 Unhandled error:", err.message);

  res.status(500).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message, // Development mein actual error dikhao, production mein hide karo
  });
}
