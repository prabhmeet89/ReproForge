import { Request, Response } from "express";
import { snapshotsService } from "./snapshots.service";
import {
  snapshotUploadSchema,
  snapshotQuerySchema,
  snapshotFilesQuerySchema,
  snapshotFileContentQuerySchema,
  sampleSnapshotSchema,
} from "./snapshots.schema";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { getRequestUserId } from "../../utils/requestUser";
import { IngestionError } from "./zipIngestion";
import { sendError } from "../../utils/response";
import fs from "fs/promises";

export const snapshotsController = {
  /**
   * POST /api/projects/:projectId/snapshots
   * Multipart upload: field "archive" (.zip) + optional "label".
   */
  async upload(req: Request, res: Response) {
    const projectId = req.params.projectId as string;
    const userId = getRequestUserId(req);

    if (!req.file) {
      return sendError(res, "Missing required 'archive' field", 400);
    }

    // Parse label from multipart body.
    const parsed = snapshotUploadSchema.safeParse(req.body);
    const label = parsed.success ? parsed.data.label : undefined;

    try {
      const { snapshot, deduplicated } = await snapshotsService.upload(
        projectId,
        userId,
        req.file.path,
        label
      );

      if (deduplicated) {
        return sendSuccess(
          res,
          { ...snapshot, deduplicated: true },
          "Snapshot already exists (deduplicated)",
          200
        );
      }

      return sendSuccess(res, snapshot, "Snapshot uploaded successfully", 201);
    } catch (err) {
      // Clean up temp file on controller-level error (belt-and-suspenders).
      if (req.file?.path) {
        await fs.rm(req.file.path, { force: true }).catch(() => {});
      }
      throw err;
    }
  },

  /**
   * POST /api/projects/:projectId/snapshots/sample
   */
  async ingestSample(req: Request, res: Response) {
    const projectId = req.params.projectId as string;
    const userId = getRequestUserId(req);

    const parsed = sampleSnapshotSchema.parse(req.body || {});
    const sampleName = parsed.sampleName || "payment-order-bug";
    const label = parsed.label;

    const { snapshot, deduplicated } = await snapshotsService.uploadSample(
      projectId,
      userId,
      sampleName,
      label
    );

    if (deduplicated) {
      return sendSuccess(
        res,
        { ...snapshot, deduplicated: true },
        "Snapshot already exists (deduplicated)",
        200
      );
    }

    return sendSuccess(res, snapshot, "Sample snapshot ingested successfully", 201);
  },


  /**
   * GET /api/projects/:projectId/snapshots
   */
  async list(req: Request, res: Response) {
    const projectId = req.params.projectId as string;
    const userId = getRequestUserId(req);

    const parsed = snapshotQuerySchema.parse(req.query);
    const { items, meta } = await snapshotsService.list(
      projectId,
      userId,
      parsed.page,
      parsed.limit
    );

    return sendPaginated(res, items, meta);
  },

  /**
   * GET /api/snapshots/:id
   */
  async getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = getRequestUserId(req);

    const snapshot = await snapshotsService.getById(id, userId);
    return sendSuccess(res, snapshot, "Snapshot retrieved successfully");
  },

  /**
   * DELETE /api/snapshots/:id
   */
  async remove(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = getRequestUserId(req);

    await snapshotsService.deleteById(id, userId);
    return sendSuccess(res, null, "Snapshot deleted successfully");
  },

  /**
   * GET /api/snapshots/:id/files
   */
  async listFiles(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = getRequestUserId(req);

    const parsed = snapshotFilesQuerySchema.parse(req.query);
    const { items, meta } = await snapshotsService.listFiles(
      id,
      userId,
      parsed
    );

    return sendPaginated(res, items, meta);
  },

  /**
   * GET /api/snapshots/:id/files/content?path=...
   */
  async getFileContent(req: Request, res: Response) {
    const id = req.params.id as string;
    const userId = getRequestUserId(req);

    const parsed = snapshotFileContentQuerySchema.parse(req.query);
    const result = await snapshotsService.getFileContent(
      id,
      userId,
      parsed.path
    );

    return sendSuccess(res, result, "File content retrieved successfully");
  },
};
