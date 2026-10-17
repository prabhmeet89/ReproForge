import { Request, Response } from "express";
import { projectsService } from "./projects.service";
import { CreateProjectInput, ProjectQueryParams } from "./projects.schema";
import { sendSuccess, sendPaginated } from "../../utils/response";

export const projectsController = {
  async list(req: Request, res: Response) {
    const query = req.query as unknown as ProjectQueryParams;
    const { items, meta } = await projectsService.getProjects(query);
    return sendPaginated(res, items, meta);
  },

  async getOne(req: Request, res: Response) {
    const id = req.params.id as string;
    const project = await projectsService.getProjectById(id);
    return sendSuccess(res, project, "Project retrieved successfully");
  },

  async create(req: Request, res: Response) {
    const input = req.body as CreateProjectInput;
    const project = await projectsService.createProject(input);
    return sendSuccess(res, project, "Project created successfully", 201);
  },
};
