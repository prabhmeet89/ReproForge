import { Request, Response } from "express";
import { testRunsService } from "./test-runs.service";
import { TestRunQueryParams } from "./test-runs.schema";
import { sendSuccess, sendPaginated } from "../../utils/response";

export const testRunsController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as TestRunQueryParams;
    const { items, meta } = await testRunsService.getTestRuns(query);
    return sendPaginated(res, items, meta);
  },

  async getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    const run = await testRunsService.getTestRunById(id);
    return sendSuccess(res, run, "Test run retrieved successfully");
  },
};
