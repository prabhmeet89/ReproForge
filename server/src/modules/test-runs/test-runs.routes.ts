import { Router } from "express";
import { testRunsController } from "./test-runs.controller";
import { testRunQuerySchema } from "./test-runs.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  validate({ query: testRunQuerySchema }),
  asyncHandler(testRunsController.list)
);

router.get(
  "/:id",
  asyncHandler(testRunsController.getOne)
);

export default router;
