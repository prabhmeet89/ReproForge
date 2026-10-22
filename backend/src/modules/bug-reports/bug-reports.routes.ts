import { Router } from "express";
import { bugReportsController } from "./bug-reports.controller";
import { createBugReportSchema, bugReportQuerySchema } from "./bug-reports.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

// Every route below is protected. requireAuth runs before validate, so an
// unauthenticated request is rejected before any validation work happens.
router.use(requireAuth);

router.get(
  "/",
  validate({ query: bugReportQuerySchema }),
  asyncHandler(bugReportsController.list)
);

router.post(
  "/",
  validate({ body: createBugReportSchema }),
  asyncHandler(bugReportsController.create)
);

router.get(
  "/:id",
  asyncHandler(bugReportsController.getOne)
);

export default router;
