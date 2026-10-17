import { z } from "zod";

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
  .strict();

export const bugReportQuerySchema = z
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
    status: bugReportStatusEnum.optional(),
    projectId: z.string().trim().optional(),
    sort: z.enum(["newest", "oldest"]).optional().default("newest"),
  })
  .strict();

export type CreateBugReportInput = z.infer<typeof createBugReportSchema>;
export type BugReportQueryParams = z.infer<typeof bugReportQuerySchema>;
