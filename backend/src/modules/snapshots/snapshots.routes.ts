import { Router } from "express";
import { snapshotsController } from "./snapshots.controller";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { uploadArchive } from "../../middleware/upload";
import { DEFAULT_LIMITS } from "./snapshots.constants";
import { IngestionError } from "./zipIngestion";
import { sendError } from "../../utils/response";
import { Request, Response, NextFunction } from "express";

const router = Router();

// All snapshot routes require authentication.
// Applied per route so unmatched /api routes fall through to 404 handler.

// --- Project-scoped routes ---

/**
 * POST /api/projects/:projectId/snapshots
 *
 * Multer processes the multipart upload first, then the controller
 * handles ingestion. Multer errors (file too large, wrong type) are
 * caught by the error handler below.
 */
router.post(
  "/projects/:projectId/snapshots",
  requireAuth,
  uploadArchive(DEFAULT_LIMITS.MAX_ARCHIVE_BYTES),
  asyncHandler(snapshotsController.upload)
);

router.get(
  "/projects/:projectId/snapshots",
  requireAuth,
  asyncHandler(snapshotsController.list)
);

router.get(
  "/snapshots/:id",
  requireAuth,
  asyncHandler(snapshotsController.getOne)
);

router.get(
  "/snapshots/:id/files/content",
  requireAuth,
  asyncHandler(snapshotsController.getFileContent)
);

router.get(
  "/snapshots/:id/files",
  requireAuth,
  asyncHandler(snapshotsController.listFiles)
);

router.delete(
  "/snapshots/:id",
  requireAuth,
  asyncHandler(snapshotsController.remove)
);

// --- Error handler for multer + ingestion errors ---

router.use(
  (err: any, _req: Request, res: Response, next: NextFunction) => {
    // Multer file-size error.
    if (err.code === "LIMIT_FILE_SIZE") {
      return sendError(
        res,
        `Archive exceeds the ${DEFAULT_LIMITS.MAX_ARCHIVE_BYTES} byte limit`,
        413
      );
    }

    // Multer general error.
    if (err.name === "MulterError") {
      return sendError(res, err.message, 400);
    }

    // Our custom ingestion error.
    if (err instanceof IngestionError) {
      return sendError(res, err.message, err.httpStatus);
    }

    // Not ours — pass along.
    next(err);
  }
);

export default router;
