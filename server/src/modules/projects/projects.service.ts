import { projectsRepository, Project } from "./projects.repository";
import { CreateProjectInput, ProjectQueryParams } from "./projects.schema";
import { AppError } from "../../utils/appError";
import { PaginationMeta } from "../../utils/response";

export const projectsService = {
  async getProjects(query: ProjectQueryParams): Promise<{ items: Project[]; meta: PaginationMeta }> {
    const { items, total } = await projectsRepository.findAll({
      search: query.search,
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

  async getProjectById(id: string): Promise<Project> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw AppError.notFound(`Project with id "${id}" was not found`);
    }
    return project;
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    return await projectsRepository.create(input);
  },
};
