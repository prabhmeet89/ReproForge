import { Request } from "express";
import { AppError } from "./appError";

/**
 * Returns the id of the authenticated user on this request.
 *
 * `requireAuth` guarantees `req.user` is set on every protected route, so
 * this is only a safety net: if a route is ever mounted without it, the
 * request fails loudly with a 401 instead of silently operating on
 * unowned data.
 */
export function getRequestUserId(req: Request): string {
  const userId = req.user?.id;
  if (!userId) {
    throw AppError.unauthorized("Authentication required");
  }
  return userId;
}
