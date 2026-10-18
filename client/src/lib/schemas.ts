import { z } from "zod";

// Project schema matching server/src/modules/projects/projects.schema.ts
export const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name cannot exceed 100 characters"),
  repositoryUrl: z
    .string()
    .trim()
    .optional()
    .refine((url) => !url || (url.startsWith("https://") && url.length > 8), {
      message: "Repository URL must be a valid https:// URL",
    }),
  defaultBranch: z.string().trim().min(1, "Branch is required"),
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;

// Bug report schema matching server/src/modules/bug-reports/bug-reports.schema.ts
export const bugReportFormSchema = z.object({
  projectId: z.string().min(1, "Please select a project"),
  title: z
    .string()
    .trim()
    .min(5, "Title must be at least 5 characters")
    .max(150, "Title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description cannot exceed 5000 characters"),
  expectedBehavior: z
    .string()
    .trim()
    .min(5, "Expected behavior must be at least 5 characters")
    .max(2000, "Expected behavior cannot exceed 2000 characters"),
  actualBehavior: z
    .string()
    .trim()
    .min(5, "Actual behavior must be at least 5 characters")
    .max(2000, "Actual behavior cannot exceed 2000 characters"),
  affectedEndpoint: z.string().trim().max(500, "Endpoint max 500 characters").optional(),
  stackTrace: z.string().max(50000, "Stack trace cannot exceed 50,000 characters").optional(),
  logs: z.string().max(50000, "Logs cannot exceed 50,000 characters").optional(),
});

export type BugReportFormData = z.infer<typeof bugReportFormSchema>;
