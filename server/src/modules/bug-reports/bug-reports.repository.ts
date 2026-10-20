import { db, toIsoString } from "../../config/db";
import { resolvePagination, resolveSort } from "../../utils/pagination";
import { BugReportStatus } from "./bug-reports.schema";

export interface BugReport {
  id: string;
  projectId: string;
  title: string;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  affectedEndpoint?: string;
  stackTrace?: string;
  logs?: string;
  status: BugReportStatus;
  createdAt: string;
  isDemo?: boolean;
}

export interface BugReportFindAllOptions {
  /** The owner. Every read is scoped to this user. */
  userId: string;
  projectId?: string;
  status?: BugReportStatus;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateBugReportData {
  ownerId: string;
  projectId: string;
  title: string;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  affectedEndpoint?: string;
  stackTrace?: string;
  logs?: string;
  status?: BugReportStatus;
  isDemo?: boolean;
}

/**
 * The orderings a bug report list may be sorted by.
 *
 * The query string is only ever used as a key into this map.
 */
const BUG_REPORT_SORT_WHITELIST = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  title: { title: "asc" },
  "title-desc": { title: "desc" },
  status: { status: "asc" },
} as const;

export const bugReportsRepository = {
  async findAll(
    options: BugReportFindAllOptions
  ): Promise<{ items: BugReport[]; total: number }> {
    const { page, limit, skip, take } = resolvePagination(options.page, options.limit);

    const where = {
      // Ownership comes from the project the report hangs off.
      project: { ownerId: options.userId },
      ...(options.projectId ? { projectId: options.projectId } : {}),
      ...(options.status ? { status: options.status } : {}),
    };

    const orderBy = resolveSort(
      BUG_REPORT_SORT_WHITELIST,
      options.sort,
      BUG_REPORT_SORT_WHITELIST.newest
    );

    const [rows, total] = await Promise.all([
      db.bugReport.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      db.bugReport.count({ where }),
    ]);

    return { items: rows.map(mapBugReport), total };
  },

  /**
   * Finds a bug report the user owns.
   *
   * The owner filter is part of the lookup, so a report belonging to
   * somebody else is indistinguishable from one that does not exist.
   */
  async findById(id: string, userId: string): Promise<BugReport | null> {
    const row = await db.bugReport.findFirst({
      where: { id, project: { ownerId: userId } },
    });
    return row ? mapBugReport(row) : null;
  },

  /**
   * Finds a bug report by its project, for the user.
   */
  async findByProjectId(
    projectId: string,
    userId: string
  ): Promise<BugReport | null> {
    const row = await db.bugReport.findFirst({
      where: { projectId, project: { ownerId: userId } },
    });
    return row ? mapBugReport(row) : null;
  },

  async create(data: CreateBugReportData): Promise<BugReport> {
    const row = await db.bugReport.create({
      data: {
        ownerId: data.ownerId,
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        expectedBehavior: data.expectedBehavior,
        actualBehavior: data.actualBehavior,
        affectedEndpoint: data.affectedEndpoint ?? null,
        stackTrace: data.stackTrace ?? null,
        logs: data.logs ?? null,
        status: data.status || "submitted",
        isDemo: data.isDemo || false,
      },
    });

    return mapBugReport(row);
  },

  async countByOwner(userId: string): Promise<number> {
    return db.bugReport.count({ where: { project: { ownerId: userId } } });
  },

  async countByStatus(userId: string): Promise<Record<string, number>> {
    const rows = await db.bugReport.groupBy({
      by: ["status"],
      where: { project: { ownerId: userId } },
      _count: { _all: true },
    });

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = row._count._all;
    }
    return counts;
  },

  async clear(): Promise<void> {
    // Test runs cascade from bug reports.
    await db.bugReport.deleteMany();
  },
};

function mapBugReport(row: {
  id: string;
  projectId: string;
  title: string;
  description: string;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  affectedEndpoint: string | null;
  stackTrace: string | null;
  logs: string | null;
  status: string;
  createdAt: Date;
  isDemo: boolean;
}): BugReport {
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
    status: row.status as BugReportStatus,
    createdAt: toIsoString(row.createdAt),
    isDemo: row.isDemo,
  };
}
