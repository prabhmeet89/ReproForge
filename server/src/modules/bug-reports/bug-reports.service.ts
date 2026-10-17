import { bugReportsRepository, BugReport } from "./bug-reports.repository";
import { CreateBugReportInput, BugReportQueryParams } from "./bug-reports.schema";
import { projectsRepository } from "../projects/projects.repository";
import { AppError } from "../../utils/appError";
import { PaginationMeta } from "../../utils/response";

export const bugReportsService = {
  async getBugReports(query: BugReportQueryParams): Promise<{ items: BugReport[]; meta: PaginationMeta }> {
    const { items, total } = await bugReportsRepository.findAll({
      projectId: query.projectId,
      status: query.status,
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

  async getBugReportById(id: string): Promise<BugReport> {
    const report = await bugReportsRepository.findById(id);
    if (!report) {
      throw AppError.notFound(`Bug report with id "${id}" was not found`);
    }
    return report;
  },

  async createBugReport(input: CreateBugReportInput): Promise<BugReport> {
    // Validate project existence
    const project = await projectsRepository.findById(input.projectId);
    if (!project) {
      throw AppError.notFound(`Referenced project with id "${input.projectId}" does not exist`);
    }

    // New bug reports always start with "submitted" status
    return await bugReportsRepository.create({
      ...input,
      status: "submitted",
    });
  },
};
