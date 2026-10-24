import { Request, Response } from "express";
import { bugReportsService } from "./bug-reports.service";
import {
  CreateBugReportInput,
  BugReportQueryParams,
  AttachSnapshotInput,
} from "./bug-reports.schema";
import { sendSuccess, sendPaginated } from "../../utils/response";
import { getRequestUserId } from "../../utils/requestUser";

export const bugReportsController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as BugReportQueryParams;
    const { items, meta } = await bugReportsService.getBugReports(
      query,
      getRequestUserId(req)
    );
    return sendPaginated(res, items, meta);
  },

  async getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    const report = await bugReportsService.getBugReportById(id, getRequestUserId(req));
    return sendSuccess(res, report, "Bug report retrieved successfully");
  },

  async create(req: Request, res: Response) {
    const input = req.body as CreateBugReportInput;
    const report = await bugReportsService.createBugReport(input, getRequestUserId(req));
    return sendSuccess(res, report, "Bug report created successfully", 201);
  },

  async attachSnapshot(req: Request, res: Response) {
    const id = req.params.id as string;
    const { snapshotId } = req.body as AttachSnapshotInput;
    const report = await bugReportsService.attachSnapshot(
      id,
      snapshotId,
      getRequestUserId(req)
    );
    return sendSuccess(res, report, "Snapshot attached successfully");
  },

  async getContextPreview(req: Request, res: Response) {
    const id = req.params.id as string;
    const preview = await bugReportsService.getContextPreview(
      id,
      getRequestUserId(req)
    );
    return sendSuccess(res, preview, "Context preview retrieved successfully");
  },
};

