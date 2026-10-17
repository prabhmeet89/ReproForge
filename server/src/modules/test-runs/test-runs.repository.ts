// TEMPORARY in-memory store, replaced by Prisma in Phase 2.
import crypto from "crypto";

export interface TestRun {
  id: string;
  bugReportId: string;
  status: "queued" | "running" | "passed" | "failed" | "error";
  exitCode?: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  createdAt: string;
  isDemo?: boolean;
}

const testRuns: TestRun[] = [];

export interface TestRunFindAllOptions {
  bugReportId?: string;
  page?: number;
  limit?: number;
}

export const testRunsRepository = {
  async findAll(options?: TestRunFindAllOptions): Promise<{ items: TestRun[]; total: number }> {
    let list = [...testRuns];

    if (options?.bugReportId) {
      list = list.filter((r) => r.bugReportId === options.bugReportId);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return { items, total };
  },

  async findById(id: string): Promise<TestRun | null> {
    const item = testRuns.find((r) => r.id === id);
    return item ? { ...item } : null;
  },

  async create(data: Omit<TestRun, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<TestRun> {
    const newRun: TestRun = {
      id: data.id || crypto.randomUUID(),
      bugReportId: data.bugReportId,
      status: data.status,
      exitCode: data.exitCode,
      durationMs: data.durationMs,
      stdout: data.stdout,
      stderr: data.stderr,
      createdAt: data.createdAt || new Date().toISOString(),
      isDemo: data.isDemo || false,
    };
    testRuns.unshift(newRun);
    return { ...newRun };
  },

  async count(): Promise<number> {
    return testRuns.length;
  },

  async clear(): Promise<void> {
    testRuns.length = 0;
  },
};
