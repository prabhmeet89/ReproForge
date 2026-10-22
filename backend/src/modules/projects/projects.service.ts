import { projectsRepository, Project } from "./projects.repository";
import { CreateProjectInput, ProjectQueryParams } from "./projects.schema";
import { AppError } from "../../utils/appError";
import { PaginationMeta } from "../../utils/response";

export const projectsService = {
  async getProjects(
    query: ProjectQueryParams,
    userId: string
  ): Promise<{ items: Project[]; meta: PaginationMeta }> {
    const { items, total } = await projectsRepository.findAll({
      userId,
      search: query.search,
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

  async getProjectById(id: string, userId: string): Promise<Project> {
    const project = await projectsRepository.findById(id, userId);
    if (!project) {
      // The same message for "does not exist" and "belongs to somebody
      // else" — the response must not tell the caller which it was.
      throw AppError.notFound(`Project with id "${id}" was not found`);
    }
    return project;
  },

  async createProject(input: CreateProjectInput, userId: string): Promise<Project> {
    return await projectsRepository.create({
      ...input,
      ownerId: userId,
    });
  },
};
