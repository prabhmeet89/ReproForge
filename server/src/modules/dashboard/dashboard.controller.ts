import { Request, Response } from "express";
import { projectsRepository } from "../projects/projects.repository";
import { bugReportsRepository } from "../bug-reports/bug-reports.repository";
import { testRunsRepository } from "../test-runs/test-runs.repository";
import { sendSuccess } from "../../utils/response";
import { getRequestUserId } from "../../utils/requestUser";

export const dashboardController = {
  async summary(req: Request, res: Response) {
    // Every count and every recent row is scoped to the caller, so the
    // dashboard shows the user's own data and nothing else.
    const userId = getRequestUserId(req);

    const totalProjects = await projectsRepository.countByOwner(userId);
    const totalBugReports = await bugReportsRepository.countByOwner(userId);
    const statusCounts = await bugReportsRepository.countByStatus(userId);
    const totalTestRuns = await testRunsRepository.countByOwner(userId);

    const { items: recentBugReports } = await bugReportsRepository.findAll({
      userId,
      limit: 5,
      sort: "newest",
    });
    const { items: recentTestRuns } = await testRunsRepository.findAll({
      userId,
      limit: 5,
      sort: "newest",
    });

    const summaryData = {
      counts: {
        projects: totalProjects,
        bugReports: totalBugReports,
        reproduced: statusCounts["reproduced"] || 0,
        unverified: statusCounts["unverified"] || 0,
        investigating: statusCounts["investigating"] || 0,
        submitted: statusCounts["submitted"] || 0,
        testRuns: totalTestRuns,
      },
      recentBugReports,
      recentTestRuns,
    };

    return sendSuccess(res, summaryData, "Dashboard summary retrieved successfully");
  },
};
