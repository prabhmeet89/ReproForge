import { db, toIsoString } from "../../config/db";
import { usersRepository } from "../users/users.repository";
import { CreateBugReportInput, BugReportStatus } from "./bug-reports.schema";

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
  projectId?: string;
  status?: BugReportStatus;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

export const bugReportsRepository = {
  async findAll(
    options?: BugReportFindAllOptions
  ): Promise<{ items: BugReport[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    const where = {
      ...(options?.projectId ? { projectId: options.projectId } : {}),
      ...(options?.status ? { status: options.status } : {}),
    };

    const [rows, total] = await Promise.all([
      db.bugReport.findMany({
        where,
        orderBy: {
          createdAt: options?.sort === "oldest" ? "asc" : "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bugReport.count({ where }),
    ]);

    return { items: rows.map(mapBugReport), total };
  },

  async findById(id: string): Promise<BugReport | null> {
    const row = await db.bugReport.findUnique({ where: { id } });
    return row ? mapBugReport(row) : null;
  },

  async create(
    data: CreateBugReportInput & { status?: BugReportStatus; isDemo?: boolean }
  ): Promise<BugReport> {
    const ownerId = await usersRepository.getOrCreateDemoUserId();

    const row = await db.bugReport.create({
      data: {
        ownerId,
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

  async count(): Promise<number> {
    return db.bugReport.count();
  },

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await db.bugReport.groupBy({
      by: ["status"],
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
