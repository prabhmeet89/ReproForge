/**
 * Snapshot service — orchestrates ownership checks, quota enforcement,
 * the ingestion pipeline, deduplication, and cleanup.
 *
 * The ingestion runs synchronously inside the request. The
 * processing → ready | failed status flow lets a future Phase 6
 * move this to a background worker without changing the API.
 */

import { snapshotsRepository, Snapshot } from "./snapshots.repository";
import { projectsRepository } from "../projects/projects.repository";
import { artifactStorage } from "../../services/artifactStorage";
import {
  ingestZip,
  IngestionError,
  type IngestionLimits,
} from "./zipIngestion";
import {
  SNAPSHOT_SOURCE,
  SNAPSHOT_STATUS,
  SNAPSHOT_ERROR,
  DEFAULT_LIMITS,
} from "./snapshots.constants";
import { AppError } from "../../utils/appError";
import { PaginationMeta } from "../../utils/response";
import fs from "fs/promises";
import path from "path";
import { analyzeRepository } from "./snapshots.analysis";
import { redactSecrets } from "../../services/secrets";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLimits(): IngestionLimits {
  return {
    maxArchiveBytes:
      parseInt(process.env.MAX_ARCHIVE_SIZE ?? "", 10) ||
      DEFAULT_LIMITS.MAX_ARCHIVE_BYTES,
    maxExtractedBytes:
      parseInt(process.env.MAX_EXTRACTED_SIZE ?? "", 10) ||
      DEFAULT_LIMITS.MAX_EXTRACTED_BYTES,
    maxEntries:
      parseInt(process.env.MAX_ENTRIES ?? "", 10) ||
      DEFAULT_LIMITS.MAX_ENTRIES,
    maxFileBytes: DEFAULT_LIMITS.MAX_FILE_BYTES,
    maxPathLength: DEFAULT_LIMITS.MAX_PATH_LENGTH,
    maxDirDepth: DEFAULT_LIMITS.MAX_DIR_DEPTH,
    maxCompressionRatio: DEFAULT_LIMITS.MAX_COMPRESSION_RATIO,
  };
}

function getMaxSnapshotsPerProject(): number {
  return (
    parseInt(process.env.MAX_SNAPSHOTS_PER_PROJECT ?? "", 10) ||
    DEFAULT_LIMITS.MAX_SNAPSHOTS_PER_PROJECT
  );
}

function getMaxSnapshotsPerUser(): number {
  return (
    parseInt(process.env.MAX_SNAPSHOTS_PER_USER ?? "", 10) ||
    DEFAULT_LIMITS.MAX_SNAPSHOTS_PER_USER
  );
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const snapshotsService = {
  /**
   * Upload and ingest a ZIP snapshot.
   *
   * Flow:
   * 1. Verify ownership
   * 2. Check quotas
   * 3. Create snapshot row (processing)
   * 4. Ingest ZIP → disk files + manifest
   * 5. Dedup check
   * 6. Bulk-insert file rows
   * 7. Mark ready
   *
   * On any failure the partial directory and temp file are cleaned up
   * in the finally block.
   */
  async upload(
    projectId: string,
    userId: string,
    tmpFilePath: string,
    label?: string
  ): Promise<{ snapshot: Snapshot; deduplicated: boolean }> {
    // 1. Ownership
    const project = await projectsRepository.findById(projectId, userId);
    if (!project) {
      throw AppError.notFound(`Project with id "${projectId}" was not found`);
    }

    // 2. Quotas
    const [projectCount, userCount] = await Promise.all([
      snapshotsRepository.countByProject(projectId),
      snapshotsRepository.countByUser(userId),
    ]);

    if (projectCount >= getMaxSnapshotsPerProject()) {
      throw new IngestionError(
        SNAPSHOT_ERROR.QUOTA_EXCEEDED,
        `Project has reached the maximum of ${getMaxSnapshotsPerProject()} snapshots`,
        429
      );
    }
    if (userCount >= getMaxSnapshotsPerUser()) {
      throw new IngestionError(
        SNAPSHOT_ERROR.QUOTA_EXCEEDED,
        `You have reached the maximum of ${getMaxSnapshotsPerUser()} snapshots`,
        429
      );
    }

    // 3. Create snapshot row — placeholder contentHash until we know the real one.
    const placeholder = "pending-" + Date.now();
    const snapshotRow = await snapshotsRepository.create({
      projectId,
      source: SNAPSHOT_SOURCE.ZIP,
      label,
      contentHash: placeholder,
      storageKey: "", // filled after we know the ID
    });

    const snapshotId = snapshotRow.id;
    const snapshotDir = artifactStorage.snapshotDir(snapshotId);
    let cleanupNeeded = true;

    try {
      // 4. Ingest
      const limits = getLimits();
      await artifactStorage.ensureDir(snapshotDir);

      const result = await ingestZip(tmpFilePath, snapshotDir, limits);

      // 5. Dedup check
      const existing = await snapshotsRepository.findByContentHash(
        projectId,
        result.contentHash
      );
      if (existing) {
        // Delete the new directory and the processing row.
        await artifactStorage.deleteSnapshot(snapshotId);
        await snapshotsRepository.deleteById(snapshotId);
        cleanupNeeded = false;
        return { snapshot: existing, deduplicated: true };
      }

      // Update the real contentHash and storageKey on the row.
      const finalRow = await snapshotsRepository.updateContentHash(
        snapshotId,
        result.contentHash,
        `snapshots/${snapshotId}/files`
      );

      // 6. Bulk-insert file rows
      await snapshotsRepository.insertFiles(finalRow.id, result.files);

      // Compute repository analysis
      const analysis = analyzeRepository(
        result.packageJsonRaw,
        result.files,
        result.excludedSecretFiles
      );

      // 7. Mark ready
      const readySnapshot = await snapshotsRepository.markReady(finalRow.id, {
        fileCount: result.fileCount,
        totalBytes: result.totalBytes,
        excludedCount: result.excludedCount,
        analysis,
        secretFindingCount: result.secretFindingCount,
      });

      cleanupNeeded = false;
      return { snapshot: readySnapshot, deduplicated: false };
    } catch (err) {
      // Mark the row as failed (if it still exists).
      try {
        await snapshotsRepository.markFailed(
          snapshotId,
          err instanceof IngestionError ? err.code : "INTERNAL_ERROR",
          err instanceof Error ? err.message : "Unknown error"
        );
      } catch {
        // Row may have been deleted already — ignore.
      }
      throw err;
    } finally {
      // Always delete temp file.
      await artifactStorage.deleteFile(tmpFilePath).catch(() => {});

      // On failure, clean up the partial snapshot directory.
      if (cleanupNeeded) {
        await artifactStorage.deleteSnapshot(snapshotId).catch(() => {});
        // Try to delete the failed row too.
        try {
          await snapshotsRepository.deleteById(snapshotId);
        } catch {
          // Might already be gone.
        }
      }
    }
  },

  /**
   * List snapshots for a project (paginated).
   */
  async list(
    projectId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: Snapshot[]; meta: PaginationMeta }> {
    // Ownership check
    const project = await projectsRepository.findById(projectId, userId);
    if (!project) {
      throw AppError.notFound(`Project with id "${projectId}" was not found`);
    }

    const { items, total } = await snapshotsRepository.findAllByProject(
      projectId,
      page,
      limit
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get a single snapshot (with ownership check via its project).
   */
  async getById(id: string, userId: string): Promise<Snapshot> {
    const snapshot = await snapshotsRepository.findById(id);
    if (!snapshot) {
      throw AppError.notFound(`Snapshot with id "${id}" was not found`);
    }

    // Ownership: the project must belong to this user.
    const project = await projectsRepository.findById(
      snapshot.projectId,
      userId
    );
    if (!project) {
      throw AppError.notFound(`Snapshot with id "${id}" was not found`);
    }

    return snapshot;
  },

  /**
   * Delete a snapshot — removes both the DB rows and the disk directory.
   */
  async deleteById(id: string, userId: string): Promise<void> {
    const snapshot = await snapshotsRepository.findById(id);
    if (!snapshot) {
      throw AppError.notFound(`Snapshot with id "${id}" was not found`);
    }

    // Ownership check
    const project = await projectsRepository.findById(
      snapshot.projectId,
      userId
    );
    if (!project) {
      throw AppError.notFound(`Snapshot with id "${id}" was not found`);
    }

    // Delete DB rows first (cascade deletes SnapshotFile rows).
    await snapshotsRepository.deleteById(id);

    // Then clean up disk.
    await artifactStorage.deleteSnapshot(id);
  },

  /**
   * List files for a snapshot (with ownership verification).
   */
  async listFiles(
    snapshotId: string,
    userId: string,
    options: {
      kind?: string;
      search?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ items: any[]; meta: PaginationMeta }> {
    // Ownership check (throws 404 if not owned)
    await this.getById(snapshotId, userId);

    const { items, total } = await snapshotsRepository.findFiles(
      snapshotId,
      options
    );

    return {
      items,
      meta: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit) || 1,
      },
    };
  },

  /**
   * Get file content with path-traversal protection and read-time secret redaction.
   * Capped at 200 KB per response.
   */
  async getFileContent(
    snapshotId: string,
    userId: string,
    requestedPath: string
  ): Promise<{
    path: string;
    language: string | null;
    lineCount: number;
    content: string;
    truncated: boolean;
    secretFindingCount: number;
  }> {
    // Ownership check (throws 404 if not owned)
    await this.getById(snapshotId, userId);

    // Path-traversal checks
    if (
      requestedPath.includes("\0") ||
      requestedPath.startsWith("/") ||
      requestedPath.startsWith("\\") ||
      /^[A-Za-z]:[/\\]/.test(requestedPath) ||
      requestedPath.split(/[/\\]/).some((seg) => seg === "..")
    ) {
      throw AppError.unprocessableEntity("Invalid file path traversal");
    }

    const normalizedPath = requestedPath.replace(/\\/g, "/");

    // Manifest lookup
    const fileRecord = await snapshotsRepository.findFileByPath(
      snapshotId,
      normalizedPath
    );
    if (!fileRecord) {
      throw AppError.notFound(
        `File "${requestedPath}" was not found in snapshot`
      );
    }

    // Disk path resolution & jail check
    const snapshotDir = artifactStorage.snapshotDir(snapshotId);
    const resolved = path.resolve(snapshotDir, normalizedPath);
    const normalizedSnapshotDir = path.resolve(snapshotDir);
    if (
      !resolved.startsWith(normalizedSnapshotDir + path.sep) &&
      resolved !== normalizedSnapshotDir
    ) {
      throw AppError.unprocessableEntity("File path escapes snapshot directory");
    }

    const exists = await artifactStorage.exists(resolved);
    if (!exists) {
      throw AppError.notFound(`File "${requestedPath}" not found on disk`);
    }

    // Read raw file from disk
    const raw = await fs.readFile(resolved, "utf8");

    // ALWAYS redact secrets at read time
    const { text: redactedText, findings } = redactSecrets(raw);

    // Cap at 200 KB
    const MAX_BYTES = 200 * 1024;
    const buf = Buffer.from(redactedText, "utf8");
    let content = redactedText;
    let truncated = false;
    if (buf.length > MAX_BYTES) {
      content = buf.subarray(0, MAX_BYTES).toString("utf8");
      truncated = true;
    }

    const secretFindingCount = Array.isArray(fileRecord.secretFindings)
      ? fileRecord.secretFindings.length
      : findings.length;

    return {
      path: fileRecord.path,
      language: fileRecord.language,
      lineCount: fileRecord.lineCount,
      content,
      truncated,
      secretFindingCount,
    };
  },
};
