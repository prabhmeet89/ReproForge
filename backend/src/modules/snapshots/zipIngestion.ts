/**
 * Safe ZIP ingestion pipeline.
 *
 * Streaming via yauzl — entries are read one-by-one from the file
 * descriptor. Every path is validated BEFORE writing. Limits are
 * enforced while streaming so a malicious archive cannot fill the
 * disk.
 *
 * Security measures:
 * - Magic-byte check (PK\x03\x04)
 * - Path traversal protection (no "..", absolute, drive letter, null)
 * - Symlink / special-entry rejection
 * - Per-entry compression-ratio guard (zip-bomb)
 * - Aggregate byte / entry limits
 * - Wrapper-folder stripping (GitHub-style "repo-main/")
 * - Binary detection via extension AND NUL-byte scan
 * - Never require/import/parse anything from the archive
 */

import yauzl from "yauzl";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import type { Readable } from "stream";
import {
  EXCLUDED_DIRS,
  BINARY_EXTENSIONS,
  SNAPSHOT_ERROR,
  DEFAULT_LIMITS,
  detectLanguage,
  detectFileKind,
} from "./snapshots.constants";
import type { SnapshotErrorCode } from "./snapshots.constants";
import { isExcludedSecretFile, redactSecrets } from "../../services/secrets";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngestionLimits {
  maxArchiveBytes: number;
  maxExtractedBytes: number;
  maxEntries: number;
  maxFileBytes: number;
  maxPathLength: number;
  maxDirDepth: number;
  maxCompressionRatio: number;
}

export interface FileManifestEntry {
  path: string;
  size: number;
  sha256: string;
  lineCount: number;
  language: string | null;
  kind: string;
  secretFindings?: unknown | null;
}

export interface IngestionResult {
  files: FileManifestEntry[];
  contentHash: string;
  totalBytes: number;
  fileCount: number;
  excludedCount: number;
  secretFindingCount: number;
  excludedSecretFiles: string[];
  packageJsonRaw?: string;
}

export class IngestionError extends Error {
  public readonly code: SnapshotErrorCode;
  public readonly httpStatus: number;

  constructor(code: SnapshotErrorCode, message: string, httpStatus: number = 400) {
    super(message);
    this.name = "IngestionError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ZIP magic bytes: PK\x03\x04 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export async function checkMagicBytes(filePath: string): Promise<void> {
  const handle = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(4);
    await handle.read(buf, 0, 4, 0);
    if (!buf.equals(ZIP_MAGIC)) {
      throw new IngestionError(
        SNAPSHOT_ERROR.INVALID_ARCHIVE,
        "The uploaded file is not a valid ZIP archive"
      );
    }
  } finally {
    await handle.close();
  }
}

/**
 * Validates and normalises a ZIP entry path.
 *
 * Rejects:
 * - ".." components (traversal)
 * - Absolute paths ("/foo", "\\foo")
 * - Drive letters ("C:\\foo", "D:/foo")
 * - Null bytes
 * - Paths longer than the limit
 * - Directories deeper than the limit
 */
export function validateEntryPath(
  rawPath: string,
  limits: IngestionLimits
): string {
  // Normalise separators to forward slash.
  let p = rawPath.replace(/\\/g, "/");

  // Reject null bytes.
  if (p.includes("\0")) {
    throw new IngestionError(
      SNAPSHOT_ERROR.UNSAFE_PATH,
      "Archive entry contains a null byte in the path"
    );
  }

  // Reject absolute paths.
  if (p.startsWith("/") || p.startsWith("\\")) {
    throw new IngestionError(
      SNAPSHOT_ERROR.UNSAFE_PATH,
      "Archive entry has an absolute path"
    );
  }

  // Reject drive letters (C:\, D:/, etc.).
  if (/^[A-Za-z]:[/\\]/.test(p)) {
    throw new IngestionError(
      SNAPSHOT_ERROR.UNSAFE_PATH,
      "Archive entry has a drive letter in the path"
    );
  }

  // Reject ".." traversal.
  const segments = p.split("/");
  if (segments.some((s) => s === "..")) {
    throw new IngestionError(
      SNAPSHOT_ERROR.UNSAFE_PATH,
      "Archive entry contains a path traversal component (..)"
    );
  }

  // Reject path length.
  if (p.length > limits.maxPathLength) {
    throw new IngestionError(
      SNAPSHOT_ERROR.UNSAFE_PATH,
      `Archive entry path exceeds ${limits.maxPathLength} characters`
    );
  }

  // Reject directory depth.
  if (segments.length > limits.maxDirDepth) {
    throw new IngestionError(
      SNAPSHOT_ERROR.UNSAFE_PATH,
      `Archive entry exceeds maximum directory depth of ${limits.maxDirDepth}`
    );
  }

  return p;
}

/**
 * Decides whether a path should be skipped (excluded from storage).
 * Returns the reason string if excluded, null if it should be kept.
 */
export function shouldExclude(
  normalizedPath: string,
  size: number,
  contentHead: Buffer | null,
  limits: IngestionLimits
): string | null {
  const segments = normalizedPath.split("/");

  // Check if any segment is an excluded directory.
  for (const seg of segments) {
    if (EXCLUDED_DIRS.has(seg)) return `excluded_dir:${seg}`;
  }

  // Check file size.
  if (size > limits.maxFileBytes) return "too_large";

  // Check binary extension.
  const ext = normalizedPath.slice(normalizedPath.lastIndexOf(".")).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return "binary_ext";

  // Check for NUL byte in first 8 KB.
  if (contentHead && contentHead.includes(0x00)) return "binary_content";

  return null;
}

/**
 * Detects whether all entries share a single top-level folder
 * (GitHub-style "repo-main/src/...") and returns the prefix to strip.
 */
export function detectWrapperFolder(paths: string[]): string | null {
  if (paths.length === 0) return null;

  const firstSegments = paths.map((p) => p.split("/")[0]);
  const first = firstSegments[0];

  if (firstSegments.every((s) => s === first)) {
    return first + "/";
  }

  return null;
}

/**
 * Computes the content hash: sha256 over sorted lines of
 * "<path>\0<fileSha256>\n".
 */
export function computeContentHash(files: FileManifestEntry[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const hash = crypto.createHash("sha256");
  for (const f of sorted) {
    hash.update(`${f.path}\0${f.sha256}\n`);
  }
  return hash.digest("hex");
}

// ---------------------------------------------------------------------------
// Main ingestion
// ---------------------------------------------------------------------------

/**
 * Opens the ZIP, extracts valid entries to snapshotDir, and returns
 * the manifest. The caller is responsible for cleanup on failure.
 */
export async function ingestZip(
  zipPath: string,
  snapshotDir: string,
  limits: IngestionLimits
): Promise<IngestionResult> {
  // 1. Check magic bytes.
  await checkMagicBytes(zipPath);

  // 2. Check archive size.
  const stat = await fs.stat(zipPath);
  if (stat.size > limits.maxArchiveBytes) {
    throw new IngestionError(
      SNAPSHOT_ERROR.ARCHIVE_TOO_LARGE,
      `Archive size ${stat.size} bytes exceeds the ${limits.maxArchiveBytes} byte limit`,
      413
    );
  }

  // 3. Open with yauzl (lazyEntries so we control the pace).
  const zipfile = await openZip(zipPath);

  let totalExtracted = 0;
  let entryCount = 0;
  let excludedCount = 0;
  const excludedSecretFiles: string[] = [];
  let secretFindingCount = 0;
  let packageJsonRaw: string | undefined;

  // First pass: collect all entry metadata to detect wrapper folder.
  const entries: yauzl.Entry[] = [];
  await collectEntries(zipfile, entries, limits);

  // Detect wrapper folder.
  const filePaths = entries
    .filter((e) => !e.fileName.endsWith("/"))
    .map((e) => validateEntryPath(e.fileName, limits));

  const wrapper = detectWrapperFolder(filePaths);

  // Re-open to stream entries (yauzl does not support rewinding).
  const zipfile2 = await openZip(zipPath);
  const manifest: FileManifestEntry[] = [];

  await new Promise<void>((resolve, reject) => {
    zipfile2.on("error", reject);

    zipfile2.on("entry", (entry: yauzl.Entry) => {
      (async () => {
        try {
          // Skip directories.
          if (entry.fileName.endsWith("/")) {
            zipfile2.readEntry();
            return;
          }

          entryCount++;

          // Entry count limit.
          if (entryCount > limits.maxEntries) {
            throw new IngestionError(
              SNAPSHOT_ERROR.TOO_MANY_FILES,
              `Archive exceeds the ${limits.maxEntries} file limit`
            );
          }

          // Reject symlinks and special entries.
          // yauzl exposes externalFileAttributes; Unix symlinks have
          // (attrs >> 16) & 0o170000 === 0o120000.
          const unixMode =
            (entry.externalFileAttributes >> 16) & 0xffff;
          if (unixMode !== 0 && (unixMode & 0o170000) === 0o120000) {
            throw new IngestionError(
              SNAPSHOT_ERROR.UNSAFE_PATH,
              "Archive contains a symbolic link entry"
            );
          }

          // Validate path.
          let entryPath = validateEntryPath(entry.fileName, limits);

          // Strip wrapper folder.
          if (wrapper && entryPath.startsWith(wrapper)) {
            entryPath = entryPath.slice(wrapper.length);
          }
          if (!entryPath) {
            zipfile2.readEntry();
            return;
          }

          // Exclude secret files (.env, *.pem, *.key, id_rsa*, etc. except .env.example)
          if (isExcludedSecretFile(entryPath)) {
            excludedCount++;
            excludedSecretFiles.push(entryPath);
            zipfile2.readEntry();
            return;
          }

          // Read the entry content.
          const chunks: Buffer[] = [];
          const stream = await openReadStream(zipfile2, entry);

          let entryBytes = 0;
          await new Promise<void>((res, rej) => {
            stream.on("data", (chunk: Buffer) => {
              entryBytes += chunk.length;

              // Compression ratio guard.
              if (
                entry.compressedSize > 0 &&
                entryBytes / entry.compressedSize > limits.maxCompressionRatio
              ) {
                stream.destroy();
                rej(
                  new IngestionError(
                    SNAPSHOT_ERROR.ZIP_BOMB,
                    `Entry "${entryPath}" has a suspicious compression ratio`
                  )
                );
                return;
              }

              // Total extracted size guard.
              totalExtracted += chunk.length;
              if (totalExtracted > limits.maxExtractedBytes) {
                stream.destroy();
                rej(
                  new IngestionError(
                    SNAPSHOT_ERROR.EXTRACTED_TOO_LARGE,
                    `Total extracted size exceeds the ${limits.maxExtractedBytes} byte limit`
                  )
                );
                return;
              }

              chunks.push(chunk);
            });
            stream.on("end", res);
            stream.on("error", rej);
          });

          const content = Buffer.concat(chunks);

          // Check exclusions (pass first 8 KB for binary detection).
          const head = content.length > 0 ? content.subarray(0, 8192) : null;
          const exclusionReason = shouldExclude(entryPath, content.length, head, limits);
          if (exclusionReason) {
            excludedCount++;
            zipfile2.readEntry();
            return;
          }

          // Resolve the final disk path and verify it stays inside snapshotDir.
          const destPath = path.resolve(snapshotDir, entryPath);
          const normalizedSnapshotDir = path.resolve(snapshotDir);
          if (!destPath.startsWith(normalizedSnapshotDir + path.sep) && destPath !== normalizedSnapshotDir) {
            throw new IngestionError(
              SNAPSHOT_ERROR.UNSAFE_PATH,
              "Resolved path escapes the snapshot directory"
            );
          }

          // Write to disk.
          await fs.mkdir(path.dirname(destPath), { recursive: true });
          await fs.writeFile(destPath, content);

          // Capture root package.json for repository analysis
          if (entryPath === "package.json") {
            packageJsonRaw = content.toString("utf8");
          }

          // Scan stored file content for secret findings (never store secret values)
          const text = content.toString("utf8");
          const { findings } = redactSecrets(text);
          secretFindingCount += findings.length;

          // Compute per-file sha256.
          const fileSha256 = crypto
            .createHash("sha256")
            .update(content)
            .digest("hex");

          // Count lines.
          let lineCount = 0;
          for (let i = 0; i < content.length; i++) {
            if (content[i] === 0x0a) lineCount++;
          }
          if (content.length > 0 && content[content.length - 1] !== 0x0a) {
            lineCount++; // last line without newline
          }

          manifest.push({
            path: entryPath,
            size: content.length,
            sha256: fileSha256,
            lineCount,
            language: detectLanguage(entryPath),
            kind: detectFileKind(entryPath),
            secretFindings: findings.length > 0 ? findings : null,
          });

          zipfile2.readEntry();
        } catch (err) {
          reject(err);
        }
      })();
    });

    zipfile2.on("end", () => resolve());
    zipfile2.readEntry();
  });

  if (manifest.length === 0) {
    throw new IngestionError(
      SNAPSHOT_ERROR.EMPTY_SNAPSHOT,
      "The archive contains no storable files after filtering"
    );
  }

  const contentHash = computeContentHash(manifest);

  return {
    files: manifest,
    contentHash,
    totalBytes: totalExtracted,
    fileCount: manifest.length,
    excludedCount,
    secretFindingCount,
    excludedSecretFiles,
    packageJsonRaw,
  };
}

// ---------------------------------------------------------------------------
// yauzl promise wrappers
// ---------------------------------------------------------------------------

function openZip(filePath: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: true }, (err, zf) => {
      if (err || !zf) return reject(err ?? new Error("Failed to open ZIP"));
      resolve(zf);
    });
  });
}

function openReadStream(
  zf: yauzl.ZipFile,
  entry: yauzl.Entry
): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zf.openReadStream(entry, (err, stream) => {
      if (err || !stream) return reject(err ?? new Error("Failed to open entry stream"));
      resolve(stream);
    });
  });
}

/**
 * Collects all entries from a yauzl ZipFile into an array.
 * Used for the wrapper-folder detection first pass.
 */
function collectEntries(
  zf: yauzl.ZipFile,
  out: yauzl.Entry[],
  limits: IngestionLimits
): Promise<void> {
  return new Promise((resolve, reject) => {
    zf.on("error", reject);
    zf.on("entry", (entry: yauzl.Entry) => {
      out.push(entry);

      // Symlink rejection during collection pass too.
      const unixMode = (entry.externalFileAttributes >> 16) & 0xffff;
      if (unixMode !== 0 && (unixMode & 0o170000) === 0o120000) {
        reject(
          new IngestionError(
            SNAPSHOT_ERROR.UNSAFE_PATH,
            "Archive contains a symbolic link entry"
          )
        );
        return;
      }

      if (!entry.fileName.endsWith("/")) {
        // Quick entry count check.
        const fileEntries = out.filter((e) => !e.fileName.endsWith("/"));
        if (fileEntries.length > limits.maxEntries) {
          reject(
            new IngestionError(
              SNAPSHOT_ERROR.TOO_MANY_FILES,
              `Archive exceeds the ${limits.maxEntries} file limit`
            )
          );
          return;
        }
      }

      zf.readEntry();
    });
    zf.on("end", () => resolve());
    zf.readEntry();
  });
}
