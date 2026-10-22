import { Router } from "express";
import { projectsController } from "./projects.controller";
import { createProjectSchema, projectQuerySchema } from "./projects.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";

const router = Router();

// Every route below is protected. requireAuth runs before validate, so an
// unauthenticated request is rejected before any validation work happens.
router.use(requireAuth);

router.get(
  "/",
  validate({ query: projectQuerySchema }),
  asyncHandler(projectsController.list)
);

router.post(
  "/",
  validate({ body: createProjectSchema }),
  asyncHandler(projectsController.create)
);

router.get(
  "/:id",
  asyncHandler(projectsController.getOne)
);

export default router;
