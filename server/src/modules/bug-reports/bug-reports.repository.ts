// TEMPORARY in-memory store, replaced by Prisma in Phase 2.
import crypto from "crypto";
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

const bugReports: BugReport[] = [];

export interface BugReportFindAllOptions {
  projectId?: string;
  status?: BugReportStatus;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

export const bugReportsRepository = {
  async findAll(options?: BugReportFindAllOptions): Promise<{ items: BugReport[]; total: number }> {
    let list = [...bugReports];

    if (options?.projectId) {
      list = list.filter((b) => b.projectId === options.projectId);
    }

    if (options?.status) {
      list = list.filter((b) => b.status === options.status);
    }

    if (options?.sort === "oldest") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return { items, total };
  },

  async findById(id: string): Promise<BugReport | null> {
    const item = bugReports.find((b) => b.id === id);
    return item ? { ...item } : null;
  },

  async create(data: CreateBugReportInput & { status?: BugReportStatus; isDemo?: boolean }): Promise<BugReport> {
    const newBugReport: BugReport = {
      id: crypto.randomUUID(),
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      expectedBehavior: data.expectedBehavior,
      actualBehavior: data.actualBehavior,
      affectedEndpoint: data.affectedEndpoint,
      stackTrace: data.stackTrace,
      logs: data.logs,
      status: data.status || "submitted",
      createdAt: new Date().toISOString(),
      isDemo: data.isDemo || false,
    };

    bugReports.unshift(newBugReport);
    return { ...newBugReport };
  },

  async count(): Promise<number> {
    return bugReports.length;
  },

  async countByStatus(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const b of bugReports) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return counts;
  },

  async clear(): Promise<void> {
    bugReports.length = 0;
  },
};
