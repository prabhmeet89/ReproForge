import { db, toIsoString } from "../../config/db";

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

export interface TestRunFindAllOptions {
  bugReportId?: string;
  page?: number;
  limit?: number;
}

export const testRunsRepository = {
  async findAll(
    options?: TestRunFindAllOptions
  ): Promise<{ items: TestRun[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    const where = options?.bugReportId
      ? { bugReportId: options.bugReportId }
      : {};

    const [rows, total] = await Promise.all([
      db.testRun.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.testRun.count({ where }),
    ]);

    return { items: rows.map(mapTestRun), total };
  },

  async findById(id: string): Promise<TestRun | null> {
    const row = await db.testRun.findUnique({ where: { id } });
    return row ? mapTestRun(row) : null;
  },

  async create(
    data: Omit<TestRun, "id" | "createdAt"> & { id?: string; createdAt?: string }
  ): Promise<TestRun> {
    const row = await db.testRun.create({
      data: {
        id: data.id || undefined,
        bugReportId: data.bugReportId,
        status: data.status,
        exitCode: data.exitCode ?? null,
        durationMs: data.durationMs ?? null,
        stdout: data.stdout ?? null,
        stderr: data.stderr ?? null,
        createdAt: data.createdAt ? new Date(data.createdAt) : undefined,
        isDemo: data.isDemo || false,
      },
    });

    return mapTestRun(row);
  },

  async count(): Promise<number> {
    return db.testRun.count();
  },

  async clear(): Promise<void> {
    await db.testRun.deleteMany();
  },
};

function mapTestRun(row: {
  id: string;
  bugReportId: string;
  status: string;
  exitCode: number | null;
  durationMs: number | null;
  stdout: string | null;
  stderr: string | null;
  createdAt: Date;
  isDemo: boolean;
}): TestRun {
  return {
    id: row.id,
    bugReportId: row.bugReportId,
    status: row.status as TestRun["status"],
    exitCode: row.exitCode ?? undefined,
    durationMs: row.durationMs ?? undefined,
    stdout: row.stdout ?? undefined,
    stderr: row.stderr ?? undefined,
    createdAt: toIsoString(row.createdAt),
    isDemo: row.isDemo,
  };
}
