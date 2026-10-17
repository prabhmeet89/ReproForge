import { Router } from "express";
import { projectsController } from "./projects.controller";
import { createProjectSchema, projectQuerySchema } from "./projects.schema";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

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
