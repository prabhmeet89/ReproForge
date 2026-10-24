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
  snapshotId: z.string().optional(),
});


export type BugReportFormData = z.infer<typeof bugReportFormSchema>;

// --- Authentication schemas ---
// These mirror server/src/modules/auth/auth.schema.ts exactly. The server
// is the authority, but the client checks the same rules first so the user
// gets an instant answer instead of a round trip.

/**
 * Email is trimmed and lower-cased, so "User@Example.COM " and
 * "user@example.com" can never become two different accounts.
 */
const authEmail = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .min(1, "Email cannot be empty")
  .email("Email must be a valid email address")
  .max(254, "Email cannot exceed 254 characters");

// Signup: the server requires at least 10 characters and at most 128.
export const signupFormSchema = z
  .object({
    email: authEmail,
    password: z
      .string({ message: "Password is required" })
      .min(10, "Password must be at least 10 characters")
      .max(128, "Password cannot exceed 128 characters"),
  })
  .refine((data) => data.password !== data.email, {
    path: ["password"],
    message: "Password must not equal the email",
  });

// Login: the server's own login schema only requires a non-empty password
// (it has to accept whatever was already stored). The client is stricter
// and asks for the same 10 characters signup does — every account was
// created with a password that long, so this blocks no real user.
export const loginFormSchema = z.object({
  email: authEmail,
  password: z
    .string({ message: "Password is required" })
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password cannot exceed 128 characters"),
});

export type SignupFormData = z.infer<typeof signupFormSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
