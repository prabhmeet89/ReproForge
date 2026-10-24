/**
 * Shared constants for the snapshots module.
 *
 * SQLite has no native enum columns, so the Prisma schema stores plain
 * Strings. Validation happens through these constant sets + Zod schemas.
 */

// ---------------------------------------------------------------------------
// Enum-like constants
// ---------------------------------------------------------------------------

export const SNAPSHOT_SOURCE = {
  ZIP: "zip",
  SAMPLE: "sample",
  GITHUB: "github",
} as const;
export type SnapshotSource = (typeof SNAPSHOT_SOURCE)[keyof typeof SNAPSHOT_SOURCE];

export const SNAPSHOT_STATUS = {
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
} as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUS)[keyof typeof SNAPSHOT_STATUS];

export const FILE_KIND = {
  SOURCE: "source",
  TEST: "test",
  CONFIG: "config",
  DOC: "doc",
  OTHER: "other",
} as const;
export type FileKind = (typeof FILE_KIND)[keyof typeof FILE_KIND];

// ---------------------------------------------------------------------------
// Directories / patterns to SKIP during ingestion
// ---------------------------------------------------------------------------

export const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".cache",
  "__pycache__",
]);

/** Known binary file extensions — files with these are skipped. */
export const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
  ".mp3", ".mp4", ".avi", ".mov", ".mkv", ".flac", ".wav", ".ogg",
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
  ".exe", ".dll", ".so", ".dylib", ".bin", ".o", ".a",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".pyc", ".pyo", ".class", ".jar",
  ".db", ".sqlite", ".sqlite3",
  ".DS_Store",
]);

// ---------------------------------------------------------------------------
// Ingestion limits (defaults — overridable via env)
// ---------------------------------------------------------------------------

export const DEFAULT_LIMITS = {
  /** Maximum archive size in bytes (25 MB). */
  MAX_ARCHIVE_BYTES: 25 * 1024 * 1024,
  /** Maximum total extracted bytes on disk (100 MB). */
  MAX_EXTRACTED_BYTES: 100 * 1024 * 1024,
  /** Maximum number of ZIP entries. */
  MAX_ENTRIES: 5_000,
  /** Maximum single stored file size (1 MB). */
  MAX_FILE_BYTES: 1 * 1024 * 1024,
  /** Maximum path length. */
  MAX_PATH_LENGTH: 255,
  /** Maximum directory depth. */
  MAX_DIR_DEPTH: 20,
  /** Compression ratio above which the entry is rejected (zip-bomb guard). */
  MAX_COMPRESSION_RATIO: 100,
  /** Maximum snapshots per project. */
  MAX_SNAPSHOTS_PER_PROJECT: 10,
  /** Maximum snapshots per user. */
  MAX_SNAPSHOTS_PER_USER: 25,
  /** Uploads per hour per user (rate limit). */
  UPLOAD_RATE_LIMIT: 10,
} as const;

// ---------------------------------------------------------------------------
// Error codes returned to the client
// ---------------------------------------------------------------------------

export const SNAPSHOT_ERROR = {
  INVALID_ARCHIVE: "INVALID_ARCHIVE",
  ARCHIVE_TOO_LARGE: "ARCHIVE_TOO_LARGE",
  TOO_MANY_FILES: "TOO_MANY_FILES",
  EXTRACTED_TOO_LARGE: "EXTRACTED_TOO_LARGE",
  UNSAFE_PATH: "UNSAFE_PATH",
  ZIP_BOMB: "ZIP_BOMB",
  EMPTY_SNAPSHOT: "EMPTY_SNAPSHOT",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
} as const;
export type SnapshotErrorCode = (typeof SNAPSHOT_ERROR)[keyof typeof SNAPSHOT_ERROR];

export { detectLanguage, detectFileKind } from "./snapshots.analysis";

