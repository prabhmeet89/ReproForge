import { Router } from "express";
import { bugReportsController } from "./bug-reports.controller";
import { createBugReportSchema, bugReportQuerySchema } from "./bug-reports.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

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
