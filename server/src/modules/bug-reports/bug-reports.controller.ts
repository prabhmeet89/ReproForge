import { Request, Response } from "express";
import { bugReportsService } from "./bug-reports.service";
import { CreateBugReportInput, BugReportQueryParams } from "./bug-reports.schema";
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
};
