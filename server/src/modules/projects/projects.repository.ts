import { db, toIsoString } from "../../config/db";
import { usersRepository } from "../users/users.repository";
import { CreateProjectInput } from "./projects.schema";

export interface Project {
  id: string;
  name: string;
  repositoryUrl?: string;
  defaultBranch: string;
  createdAt: string;
  isDemo?: boolean;
}

export const projectsRepository = {
  async findAll(options?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Project[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;

    const where = options?.search
      ? { name: { contains: options.search } }
      : {};

    const [rows, total] = await Promise.all([
      db.project.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.project.count({ where }),
    ]);

    return { items: rows.map(mapProject), total };
  },

  async findById(id: string): Promise<Project | null> {
    const row = await db.project.findUnique({ where: { id } });
    return row ? mapProject(row) : null;
  },

  async create(data: CreateProjectInput & { isDemo?: boolean }): Promise<Project> {
    const ownerId = await usersRepository.getOrCreateDemoUserId();

    const row = await db.project.create({
      data: {
        ownerId,
        name: data.name,
        repositoryUrl: data.repositoryUrl ?? null,
        defaultBranch: data.defaultBranch || "main",
        isDemo: data.isDemo || false,
      },
    });

    return mapProject(row);
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
