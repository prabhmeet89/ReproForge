import { z } from "zod";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../../utils/pagination";

export const bugReportStatusEnum = z.enum([
  "submitted",
  "investigating",
  "investigated",
  "test_generated",
  "reproduced",
  "unverified",
  "failed",
]);

export type BugReportStatus = z.infer<typeof bugReportStatusEnum>;

export const createBugReportSchema = z
  .object({
    projectId: z
      .string({ message: "projectId is required" })
      .trim()
      .min(1, "projectId cannot be empty"),
    title: z
      .string({ message: "title is required" })
      .trim()
      .min(5, "Title must be at least 5 characters")
      .max(150, "Title cannot exceed 150 characters"),
    description: z
      .string({ message: "description is required" })
      .trim()
      .min(10, "Description must be at least 10 characters")
      .max(5000, "Description cannot exceed 5000 characters"),
    expectedBehavior: z
      .string({ message: "expectedBehavior is required" })
      .trim()
      .min(5, "Expected behavior must be at least 5 characters")
      .max(2000, "Expected behavior cannot exceed 2000 characters"),
    actualBehavior: z
      .string({ message: "actualBehavior is required" })
      .trim()
      .min(5, "Actual behavior must be at least 5 characters")
      .max(2000, "Actual behavior cannot exceed 2000 characters"),
    affectedEndpoint: z.string().trim().max(500).optional(),
    stackTrace: z.string().max(50000, "Stack trace cannot exceed 50,000 characters").optional(),
    logs: z.string().max(50000, "Logs cannot exceed 50,000 characters").optional(),
  })
  // `.strict()` means ownerId / isDemo / userId in the body are rejected
  // with a 422 — ownership always comes from the session, never the client.
  .strict();

/**
 * The orderings a bug report list accepts.
 *
 * This is a whitelist, not a free-form string: the value is validated here
 * and mapped to a fixed `orderBy` in the repository.
 */
export const bugReportSortEnum = z.enum([
  "newest",
  "oldest",
  "title",
  "title-desc",
  "status",
]);

export const bugReportQuerySchema = z
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
    status: bugReportStatusEnum.optional(),
    projectId: z.string().trim().optional(),
    sort: bugReportSortEnum.optional().default("newest"),
  })
  .strict();

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;
export type BugReportQueryParams = z.infer<typeof bugReportQuerySchema>;
