import { testRunsRepository, TestRun } from "./test-runs.repository";
import { TestRunQueryParams } from "./test-runs.schema";
import { AppError } from "../../utils/appError";
import { PaginationMeta } from "../../utils/response";

export const testRunsService = {
  async getTestRuns(
    query: TestRunQueryParams,
    userId: string
  ): Promise<{ items: TestRun[]; meta: PaginationMeta }> {
    const { items, total } = await testRunsRepository.findAll({
      userId,
      bugReportId: query.bugReportId,
      sort: query.sort,
      page: query.page,
      limit: query.limit,
    });

    const meta: PaginationMeta = {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit) || 1,
    };

    return { items, meta };
  },

  async getTestRunById(id: string, userId: string): Promise<TestRun> {
    const run = await testRunsRepository.findById(id, userId);
    if (!run) {
      // Same message for "does not exist" and "belongs to somebody else".
      throw AppError.notFound(`Test run with id "${id}" was not found`);
    }
    return run;
  },
};
