// TEMPORARY in-memory store, replaced by Prisma in Phase 2.
import crypto from "crypto";
import { CreateProjectInput } from "./projects.schema";

export interface Project {
  id: string;
  name: string;
  repositoryUrl?: string;
  defaultBranch: string;
  createdAt: string;
  isDemo?: boolean;
}

const projects: Project[] = [];

export const projectsRepository = {
  async findAll(options?: { search?: string; page?: number; limit?: number }): Promise<{ items: Project[]; total: number }> {
    let list = [...projects];

    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    const total = list.length;
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const startIndex = (page - 1) * limit;
    const items = list.slice(startIndex, startIndex + limit);

    return { items, total };
  },

  async findById(id: string): Promise<Project | null> {
    const item = projects.find((p) => p.id === id);
    return item ? { ...item } : null;
  },

  async create(data: CreateProjectInput & { isDemo?: boolean }): Promise<Project> {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: data.name,
      repositoryUrl: data.repositoryUrl,
      defaultBranch: data.defaultBranch || "main",
      createdAt: new Date().toISOString(),
      isDemo: data.isDemo || false,
    };
    projects.unshift(newProject);
    return { ...newProject };
  },

  async clear(): Promise<void> {
    projects.length = 0;
  },
};
