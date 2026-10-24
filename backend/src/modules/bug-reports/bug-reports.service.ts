import { db } from "../../config/db";
import { bugReportsRepository, BugReport } from "./bug-reports.repository";
import { CreateBugReportInput, BugReportQueryParams } from "./bug-reports.schema";
import { projectsRepository } from "../projects/projects.repository";
import { snapshotsRepository } from "../snapshots/snapshots.repository";
import { buildContextPreview, type ContextPreviewResult } from "../../services/contextBuilder";
import { AppError } from "../../utils/appError";
import { PaginationMeta } from "../../utils/response";

export const bugReportsService = {
  async getBugReports(
    query: BugReportQueryParams,
    userId: string
  ): Promise<{ items: BugReport[]; meta: PaginationMeta }> {
    const { items, total } = await bugReportsRepository.findAll({
      userId,
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

  async getBugReportById(id: string, userId: string): Promise<BugReport> {
    const report = await bugReportsRepository.findById(id, userId);
    if (!report) {
      // Same message for "does not exist" and "belongs to somebody else".
      throw AppError.notFound(`Bug report with id "${id}" was not found`);
    }
    return report;
  },

  async createBugReport(input: CreateBugReportInput, userId: string): Promise<BugReport> {
    // The project lookup is ownership-scoped: a project that does not exist
    // and a project owned by somebody else both come back as "not found",
    // so the response never reveals that the id exists.
    const project = await projectsRepository.findById(input.projectId, userId);
    if (!project) {
      throw AppError.notFound(`Referenced project with id "${input.projectId}" does not exist`);
    }

    if (input.snapshotId) {
      const snapshot = await snapshotsRepository.findById(input.snapshotId);
      if (!snapshot || snapshot.projectId !== input.projectId) {
        throw AppError.notFound(`Snapshot with id "${input.snapshotId}" was not found`);
      }
    }

    // The insert and its ownership check run in one transaction, so a
    // project cannot be deleted between the check and the insert.
    return await db.$transaction(async (tx) => {
      // New bug reports always start with "submitted" status.
      const row = await tx.bugReport.create({
        data: {
          ownerId: userId,
          projectId: input.projectId,
          title: input.title,
          description: input.description,
          expectedBehavior: input.expectedBehavior,
          actualBehavior: input.actualBehavior,
          affectedEndpoint: input.affectedEndpoint ?? null,
          stackTrace: input.stackTrace ?? null,
          logs: input.logs ?? null,
          status: "submitted",
          isDemo: false,
          snapshotId: input.snapshotId ?? null,
        },
      });

      return {
        id: row.id,
        projectId: row.projectId,
        title: row.title,
        description: row.description,
        expectedBehavior: row.expectedBehavior ?? "",
        actualBehavior: row.actualBehavior ?? "",
        affectedEndpoint: row.affectedEndpoint ?? undefined,
        stackTrace: row.stackTrace ?? undefined,
        logs: row.logs ?? undefined,
        status: row.status as BugReport["status"],
        createdAt: row.createdAt.toISOString(),
        isDemo: row.isDemo,
        snapshotId: row.snapshotId ?? undefined,
      };
    });
  },

  async attachSnapshot(
    id: string,
    snapshotId: string,
    userId: string
  ): Promise<BugReport> {
    const report = await bugReportsRepository.findById(id, userId);
    if (!report) {
      throw AppError.notFound(`Bug report with id "${id}" was not found`);
    }

    const snapshot = await snapshotsRepository.findById(snapshotId);
    if (!snapshot || snapshot.projectId !== report.projectId) {
      throw AppError.notFound(`Snapshot with id "${snapshotId}" was not found`);
    }

    const updated = await bugReportsRepository.attachSnapshot(id, snapshotId);
    if (!updated) {
      throw AppError.notFound(`Bug report with id "${id}" was not found`);
    }
    return updated;
  },

  async getContextPreview(
    id: string,
    userId: string
  ): Promise<ContextPreviewResult> {
    const report = await bugReportsRepository.findById(id, userId);
    if (!report) {
      throw AppError.notFound(`Bug report with id "${id}" was not found`);
    }

    if (!report.snapshotId) {
      throw AppError.badRequest(
        `Bug report with id "${id}" does not have an attached snapshot`
      );
    }

    return await buildContextPreview(report.snapshotId, {
      stackTrace: report.stackTrace,
      logs: report.logs,
      description: report.description,
      affectedEndpoint: report.affectedEndpoint,
    });
  },
};

