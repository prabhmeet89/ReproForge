import { z } from "zod";

export const createProjectSchema = z
  .object({
    name: z
      .string({ message: "Project name is required" })
      .trim()
      .min(2, "Project name must be at least 2 characters")
      .max(100, "Project name cannot exceed 100 characters"),
    repositoryUrl: z
      .string()
      .trim()
      .url("Repository URL must be a valid URL")
      .refine((url) => url.startsWith("https://"), {
        message: "Repository URL must use https://",
      })
      .optional(),
    defaultBranch: z.string().trim().min(1).default("main"),
  })
  .strict();

export const projectQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .default("1")
      .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
    limit: z
      .string()
      .optional()
      .default("10")
      .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 10))),
    search: z.string().trim().optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ProjectQueryParams = z.infer<typeof projectQuerySchema>;
