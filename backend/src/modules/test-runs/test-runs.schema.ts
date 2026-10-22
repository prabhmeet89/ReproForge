import { z } from "zod";
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from "../../utils/pagination";

/**
 * The orderings a test run list accepts.
 *
 * This is a whitelist, not a free-form string: the value is validated here
 * and mapped to a fixed `orderBy` in the repository.
 */
export const testRunSortEnum = z.enum(["newest", "oldest", "status"]);

export const testRunQuerySchema = z
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
    bugReportId: z.string().trim().optional(),
    sort: testRunSortEnum.optional().default("newest"),
  })
  .strict();

export type TestRunQueryParams = z.infer<typeof testRunQuerySchema>;
