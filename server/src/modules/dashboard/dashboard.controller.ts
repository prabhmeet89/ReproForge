import { Request, Response } from "express";
import { projectsRepository } from "../projects/projects.repository";
import { bugReportsRepository } from "../bug-reports/bug-reports.repository";
import { testRunsRepository } from "../test-runs/test-runs.repository";
import { sendSuccess } from "../../utils/response";

export const dashboardController = {
  async summary(_req: Request, res: Response) {
    const { total: totalProjects } = await projectsRepository.findAll({ limit: 1 });
    const { total: totalBugReports, items: recentBugReports } = await bugReportsRepository.findAll({
      limit: 5,
      sort: "newest",
    });
    const statusCounts = await bugReportsRepository.countByStatus();
    const { total: totalTestRuns, items: recentTestRuns } = await testRunsRepository.findAll({
      limit: 5,
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
