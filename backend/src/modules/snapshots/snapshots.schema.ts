import { z } from "zod";
import { SNAPSHOT_SOURCE, SNAPSHOT_STATUS } from "./snapshots.constants";

// ---------------------------------------------------------------------------
// Upload (multipart — archive field handled by multer, label in body)
// ---------------------------------------------------------------------------

export const snapshotUploadSchema = z.object({
  label: z.string().trim().max(200).optional(),
});
export type SnapshotUploadInput = z.infer<typeof snapshotUploadSchema>;

// ---------------------------------------------------------------------------
// List query
// ---------------------------------------------------------------------------

export const snapshotQuerySchema = z.object({
  page: z
    .string()
    .default("1")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .default("20")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100)),
});
export type SnapshotQueryParams = z.infer<typeof snapshotQuerySchema>;

// ---------------------------------------------------------------------------
// Files list query
// ---------------------------------------------------------------------------

export const snapshotFilesQuerySchema = z.object({
  kind: z.enum(["source", "test", "config", "doc", "other"]).optional(),
  search: z.string().trim().optional(),
  page: z
    .string()
    .default("1")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .default("50")
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(200)),
});
export type SnapshotFilesQueryParams = z.infer<typeof snapshotFilesQuerySchema>;

// ---------------------------------------------------------------------------
// File content query
// ---------------------------------------------------------------------------

export const snapshotFileContentQuerySchema = z.object({
  path: z.string().trim().min(1, "File path is required"),
});
export type SnapshotFileContentQueryParams = z.infer<
  typeof snapshotFileContentQuerySchema
>;
