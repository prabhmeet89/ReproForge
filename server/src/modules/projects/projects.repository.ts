import { db, toIsoString } from "../../config/db";
import { resolvePagination, resolveSort } from "../../utils/pagination";

export interface Project {
  id: string;
  name: string;
  repositoryUrl?: string;
  defaultBranch: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface ProjectFindAllOptions {
  /** The owner. Every read is scoped to this user — there is no unfiltered path. */
  userId: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface CreateProjectData {
  ownerId: string;
  name: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  isDemo?: boolean;
}

/**
 * The orderings a project list may be sorted by.
 *
 * The query string is only ever used as a key into this map, so an
 * arbitrary value from a client can never reach Prisma's `orderBy`.
 */
const PROJECT_SORT_WHITELIST = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name: { name: "asc" },
  "name-desc": { name: "desc" },
} as const;

export const projectsRepository = {
  async findAll(
    options: ProjectFindAllOptions
  ): Promise<{ items: Project[]; total: number }> {
    const { page, limit, skip, take } = resolvePagination(options.page, options.limit);

    // SQLite's LIKE is case-insensitive for ASCII, so `contains` already
    // matches regardless of the case of the search term. Prisma's
    // `mode: "insensitive"` is not supported on SQLite, so it is not used.
    const where = {
      ownerId: options.userId,
      ...(options.search ? { name: { contains: options.search } } : {}),
    };

    const orderBy = resolveSort(PROJECT_SORT_WHITELIST, options.sort, PROJECT_SORT_WHITELIST.newest);

    const [rows, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      db.project.count({ where }),
    ]);

    return { items: rows.map(mapProject), total };
  },

  /**
   * Finds a project the user owns.
   *
   * The owner filter is part of the lookup, not a check that happens
   * afterwards — there is no code path that can read a row without also
   * proving ownership.
   */
  async findById(id: string, userId: string): Promise<Project | null> {
    const row = await db.project.findFirst({ where: { id, ownerId: userId } });
    return row ? mapProject(row) : null;
  },

  async create(data: CreateProjectData): Promise<Project> {
    const row = await db.project.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        repositoryUrl: data.repositoryUrl ?? null,
        defaultBranch: data.defaultBranch || "main",
        isDemo: data.isDemo || false,
      },
    });

    return mapProject(row);
  },

  async countByOwner(userId: string): Promise<number> {
    return db.project.count({ where: { ownerId: userId } });
  },

  async clear(): Promise<void> {
    // Bug reports and test runs cascade from projects.
    await db.project.deleteMany();
  },
};

function mapProject(row: {
  id: string;
  name: string;
  repositoryUrl: string | null;
  defaultBranch: string;
  createdAt: Date;
  isDemo: boolean;
}): Project {
  return {
    id: row.id,
    name: row.name,
    repositoryUrl: row.repositoryUrl ?? undefined,
    defaultBranch: row.defaultBranch,
    createdAt: toIsoString(row.createdAt),
    isDemo: row.isDemo,
  };
}
