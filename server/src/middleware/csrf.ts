import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/appError";

/** Methods that can change state and therefore need CSRF protection. */
const PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Origin-based CSRF protection.
 *
 * A cross-site form post cannot set a custom Origin header, and browsers send
 * the Origin header on every state-changing request. If the Origin does not
 * match our own client, the request is rejected.
 *
 * A request without an Origin header is allowed through: that covers
 * non-browser clients (curl, the test suite, server-to-server calls) which
 * are not subject to CSRF in the first place.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (!PROTECTED_METHODS.has(req.method)) {
    return next();
  }

  const origin = req.headers.origin;

  if (!origin) {
    return next();
  }

  if (origin !== env.CLIENT_URL) {
    return next(
      AppError.forbidden("Cross-origin request blocked: the Origin header is not allowed")
    );
  }

  return next();
}
