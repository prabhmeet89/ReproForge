import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

// The dashboard is protected like every other domain route.
router.use(requireAuth);

router.get(
  "/summary",
  asyncHandler(dashboardController.summary)
);

export default router;
