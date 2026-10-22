import { Router } from "express";
import { authController } from "./auth.controller";
import { signupSchema, loginSchema } from "./auth.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { authRateLimiter } from "../../middleware/rateLimit";

const router = Router();

// Signup and login are rate limited per IP to slow down credential stuffing.
router.post(
  "/signup",
  authRateLimiter,
  validate({ body: signupSchema }),
  asyncHandler(authController.signup)
);

router.post(
  "/login",
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login)
);

router.post(
  "/logout",
  asyncHandler(authController.logout)
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(authController.me)
);

export default router;
