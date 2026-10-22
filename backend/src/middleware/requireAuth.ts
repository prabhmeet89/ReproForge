import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { authService } from "../modules/auth/auth.service";
import { AppError } from "../utils/appError";

/**
 * The identity attached to a request once the session cookie has been
 * verified. Deliberately minimal — it holds no secret material.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Rejects the request unless it carries a valid session cookie.
 *
 * On success `req.user` is set to { id, email }. The session token is never
 * placed on the request object, so it cannot leak into a response by accident.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[env.SESSION_COOKIE_NAME];
    const user = await authService.getUserBySessionToken(token);

    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
}
