import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get(
  "/summary",
  asyncHandler(dashboardController.summary)
);

export default router;
