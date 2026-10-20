import { Request, Response } from "express";
import { env } from "../../config/env";
import { sendSuccess } from "../../utils/response";
import { AppError } from "../../utils/appError";
import { authService } from "./auth.service";

/**
 * Options for the session cookie.
 *
 * httpOnly keeps the token away from JavaScript, so an XSS bug cannot read it.
 * sameSite=lax stops other sites from sending it along with requests.
 */
function cookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export const authController = {
  async signup(req: Request, res: Response) {
    const { user, sessionToken, expiresAt } = await authService.signup(req.body);

    res.cookie(env.SESSION_COOKIE_NAME, sessionToken, cookieOptions(expiresAt));

    // Log the event without any secret material.
    console.log(`🔐 auth: signup userId=${user.id} ip=${req.ip ?? "unknown"}`);

    return sendSuccess(res, user, "Account created successfully", 201);
  },

  async login(req: Request, res: Response) {
    const { user, sessionToken, expiresAt } = await authService.login(req.body);

    res.cookie(env.SESSION_COOKIE_NAME, sessionToken, cookieOptions(expiresAt));

    console.log(`🔐 auth: login userId=${user.id} ip=${req.ip ?? "unknown"}`);

    return sendSuccess(res, user, "Logged in successfully");
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[env.SESSION_COOKIE_NAME];

    await authService.logout(token);

    // Clear the cookie regardless of whether a session existed.
    res.clearCookie(env.SESSION_COOKIE_NAME, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
    });

    console.log(`🔐 auth: logout ip=${req.ip ?? "unknown"}`);

    return sendSuccess(res, null, "Logged out successfully");
  },

  async me(req: Request, res: Response) {
    const user = req.user;

    if (!user) {
      throw AppError.unauthorized("Authentication required");
    }

    return sendSuccess(res, user, "Current user retrieved successfully");
  },
};
