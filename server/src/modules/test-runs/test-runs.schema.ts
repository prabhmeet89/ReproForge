import { z } from "zod";

export const testRunQuerySchema = z
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
    bugReportId: z.string().trim().optional(),
  })
  .strict();

export type TestRunQueryParams = z.infer<typeof testRunQuerySchema>;
