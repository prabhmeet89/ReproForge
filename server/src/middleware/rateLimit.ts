import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Rate limiter for the authentication endpoints.
 *
 * Signup and login are the two places where an attacker can hammer the server
 * — creating throwaway accounts or trying passwords in bulk — so they get
 * their own, tighter budget.
 *
 * It is disabled during tests, otherwise the suite would trip the limit.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    success: false,
    message: "Too many attempts, please try again later",
  },
});
