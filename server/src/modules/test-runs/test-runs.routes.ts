import { Router } from "express";
import { testRunsController } from "./test-runs.controller";
import { testRunQuerySchema } from "./test-runs.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

// Every route below is protected. requireAuth runs before validate, so an
// unauthenticated request is rejected before any validation work happens.
router.use(requireAuth);

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
