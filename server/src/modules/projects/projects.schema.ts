import { z } from "zod";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../../utils/pagination";

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
  // `.strict()` means ownerId / isDemo / userId in the body are rejected
  // with a 422 — ownership always comes from the session, never the client.
  .strict();

/**
 * The orderings a project list accepts.
 *
 * This is a whitelist, not a free-form string: the value is validated
 * here and mapped to a fixed `orderBy` in the repository, so a client can
 * never pass an arbitrary field name to Prisma.
 */
export const projectSortEnum = z.enum([
  "newest",
  "oldest",
  "name",
  "name-desc",
]);

export const projectQuerySchema = z
  .object({
    page: z
      .string()
      .optional()
      .default(String(DEFAULT_PAGE))
      .transform((val) => Math.max(1, parseInt(val, 10) || DEFAULT_PAGE)),
    limit: z
      .string()
      .optional()
      .default(String(DEFAULT_LIMIT))
      .transform((val) => Math.min(MAX_LIMIT, Math.max(1, parseInt(val, 10) || DEFAULT_LIMIT))),
    search: z.string().trim().optional(),
    sort: projectSortEnum.optional().default("newest"),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type ProjectQueryParams = z.infer<typeof projectQuerySchema>;
