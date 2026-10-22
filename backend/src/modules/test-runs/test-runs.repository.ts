import { db, toIsoString } from "../../config/db";
import { resolvePagination, resolveSort } from "../../utils/pagination";

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
  /** The owner. Every read is scoped to this user. */
  userId: string;
  bugReportId?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateTestRunData {
  bugReportId: string;
  status: TestRun["status"];
  exitCode?: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  id?: string;
  createdAt?: string;
  isDemo?: boolean;
}

/**
 * The orderings a test run list may be sorted by.
 *
 * The query string is only ever used as a key into this map.
 */
const TEST_RUN_SORT_WHITELIST = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  status: { status: "asc" },
} as const;

export const testRunsRepository = {
  async findAll(
    options: TestRunFindAllOptions
  ): Promise<{ items: TestRun[]; total: number }> {
    const { page, limit, skip, take } = resolvePagination(options.page, options.limit);

    const where = {
      // Ownership comes from the bug report's project, two levels up.
      bugReport: { project: { ownerId: options.userId } },
      ...(options.bugReportId ? { bugReportId: options.bugReportId } : {}),
    };

    const orderBy = resolveSort(
      TEST_RUN_SORT_WHITELIST,
      options.sort,
      TEST_RUN_SORT_WHITELIST.newest
    );

    const [rows, total] = await Promise.all([
      db.testRun.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      db.testRun.count({ where }),
    ]);

    return { items: rows.map(mapTestRun), total };
  },

  /**
   * Finds a test run the user owns.
   *
   * The owner filter is part of the lookup, so a run belonging to somebody
   * else is indistinguishable from one that does not exist.
   */
  async findById(id: string, userId: string): Promise<TestRun | null> {
    const row = await db.testRun.findFirst({
      where: { id, bugReport: { project: { ownerId: userId } } },
    });
    return row ? mapTestRun(row) : null;
  },

  async create(data: CreateTestRunData): Promise<TestRun> {
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

  async countByOwner(userId: string): Promise<number> {
    return db.testRun.count({
      where: { bugReport: { project: { ownerId: userId } } },
    });
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
