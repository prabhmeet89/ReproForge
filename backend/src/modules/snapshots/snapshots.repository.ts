/**
 * Snapshot repository — Prisma CRUD for RepoSnapshot + SnapshotFile.
 *
 * JSON fields (analysis, secretFindings) are stored as Strings in
 * SQLite. JSON.stringify / JSON.parse happens HERE ONLY.
 *
 * Bulk SnapshotFile inserts are done in ~500-row chunks inside a
 * short transaction.
 */

import { db, toIsoString } from "../../config/db";
import type { FileManifestEntry } from "./zipIngestion";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface Snapshot {
  id: string;
  projectId: string;
  source: string;
  label: string | null;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  contentHash: string;
  commitSha: string | null;
  fileCount: number;
  totalBytes: number;
  excludedCount: number;
  storageKey: string;
  analysis: unknown | null;
  secretFindingCount: number;
  createdAt: string;
}

export interface SnapshotFile {
  id: string;
  snapshotId: string;
  path: string;
  size: number;
  sha256: string;
  lineCount: number;
  language: string | null;
  kind: string;
  secretFindings: unknown | null;
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapSnapshot(row: any): Snapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    source: row.source,
    label: row.label ?? null,
    status: row.status,
    errorCode: row.errorCode ?? null,
    errorMessage: row.errorMessage ?? null,
    contentHash: row.contentHash,
    commitSha: row.commitSha ?? null,
    fileCount: row.fileCount,
    totalBytes: row.totalBytes,
    excludedCount: row.excludedCount,
    storageKey: row.storageKey,
    analysis: row.analysis ? JSON.parse(row.analysis) : null,
    secretFindingCount: row.secretFindingCount,
    createdAt: toIsoString(row.createdAt),
  };
}

function mapSnapshotFile(row: any): SnapshotFile {
  return {
    id: row.id,
    snapshotId: row.snapshotId,
    path: row.path,
    size: row.size,
    sha256: row.sha256,
    lineCount: row.lineCount,
    language: row.language ?? null,
    kind: row.kind,
    secretFindings: row.secretFindings ? JSON.parse(row.secretFindings) : null,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

const BULK_CHUNK_SIZE = 500;

export const snapshotsRepository = {
  /**
   * Creates a snapshot row in "processing" state.
   */
  async create(data: {
    projectId: string;
    source: string;
    label?: string;
    contentHash: string;
    storageKey: string;
  }): Promise<Snapshot> {
    const row = await db.repoSnapshot.create({
      data: {
        projectId: data.projectId,
        source: data.source,
        label: data.label ?? null,
        contentHash: data.contentHash,
        storageKey: data.storageKey,
      },
    });
    return mapSnapshot(row);
  },

  /**
   * Updates contentHash and storageKey once ingestion completes.
   */
  async updateContentHash(
    id: string,
    contentHash: string,
    storageKey: string
  ): Promise<Snapshot> {
    const row = await db.repoSnapshot.update({
      where: { id },
      data: { contentHash, storageKey },
    });
    return mapSnapshot(row);
  },

  /**
   * Marks the snapshot as ready with its final stats.
   */
  async markReady(
    id: string,
    stats: {
      fileCount: number;
      totalBytes: number;
      excludedCount: number;
      analysis?: unknown;
      secretFindingCount?: number;
    }
  ): Promise<Snapshot> {
    const row = await db.repoSnapshot.update({
      where: { id },
      data: {
        status: "ready",
        fileCount: stats.fileCount,
        totalBytes: stats.totalBytes,
        excludedCount: stats.excludedCount,
        analysis: stats.analysis !== undefined ? JSON.stringify(stats.analysis) : null,
        secretFindingCount: stats.secretFindingCount ?? 0,
      },
    });
    return mapSnapshot(row);
  },

  /**
   * Marks the snapshot as failed.
   */
  async markFailed(
    id: string,
    errorCode: string,
    errorMessage: string
  ): Promise<void> {
    await db.repoSnapshot.update({
      where: { id },
      data: { status: "failed", errorCode, errorMessage },
    });
  },

  /**
   * Finds a snapshot by its primary key. Does NOT enforce ownership —
   * the service layer must check that.
   */
  async findById(id: string): Promise<Snapshot | null> {
    const row = await db.repoSnapshot.findUnique({ where: { id } });
    return row ? mapSnapshot(row) : null;
  },

  /**
   * Finds a snapshot by its unique (projectId, contentHash) pair.
   * Used for deduplication.
   */
  async findByContentHash(
    projectId: string,
    contentHash: string
  ): Promise<Snapshot | null> {
    const row = await db.repoSnapshot.findUnique({
      where: {
        projectId_contentHash: { projectId, contentHash },
      },
    });
    return row ? mapSnapshot(row) : null;
  },

  /**
   * Lists snapshots for a project, paginated.
   */
  async findAllByProject(
    projectId: string,
    page: number,
    limit: number
  ): Promise<{ items: Snapshot[]; total: number }> {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      db.repoSnapshot.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.repoSnapshot.count({ where: { projectId } }),
    ]);
    return { items: rows.map(mapSnapshot), total };
  },

  /**
   * Counts snapshots owned by a project.
   */
  async countByProject(projectId: string): Promise<number> {
    return db.repoSnapshot.count({ where: { projectId } });
  },

  /**
   * Counts total snapshots across all projects owned by a user.
   */
  async countByUser(userId: string): Promise<number> {
    return db.repoSnapshot.count({
      where: { project: { ownerId: userId } },
    });
  },

  /**
   * Deletes a snapshot row (cascade will remove SnapshotFile rows).
   */
  async deleteById(id: string): Promise<void> {
    await db.repoSnapshot.delete({ where: { id } });
  },

  /**
   * Bulk-inserts SnapshotFile rows in ~500-row transaction chunks.
   */
  async insertFiles(
    snapshotId: string,
    files: FileManifestEntry[]
  ): Promise<void> {
    for (let i = 0; i < files.length; i += BULK_CHUNK_SIZE) {
      const chunk = files.slice(i, i + BULK_CHUNK_SIZE);
      await db.$transaction(
        chunk.map((f) =>
          db.snapshotFile.create({
            data: {
              snapshotId,
              path: f.path,
              size: f.size,
              sha256: f.sha256,
              lineCount: f.lineCount,
              language: f.language ?? null,
              kind: f.kind,
              secretFindings: f.secretFindings
                ? JSON.stringify(f.secretFindings)
                : null,
            },
          })
        )
      );
    }
  },

  /**
   * Finds files for a snapshot with optional kind and search filters, paginated.
   */
  async findFiles(
    snapshotId: string,
    options: {
      kind?: string;
      search?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ items: SnapshotFile[]; total: number }> {
    const where: any = { snapshotId };
    if (options.kind) {
      where.kind = options.kind;
    }
    if (options.search) {
      where.path = { contains: options.search };
    }

    const skip = (options.page - 1) * options.limit;
    const [rows, total] = await Promise.all([
      db.snapshotFile.findMany({
        where,
        orderBy: { path: "asc" },
        skip,
        take: options.limit,
      }),
      db.snapshotFile.count({ where }),
    ]);

    return {
      items: rows.map(mapSnapshotFile),
      total,
    };
  },

  /**
   * Finds a single file in a snapshot by exact relative path.
   */
  async findFileByPath(
    snapshotId: string,
    path: string
  ): Promise<SnapshotFile | null> {
    const row = await db.snapshotFile.findUnique({
      where: {
        snapshotId_path: { snapshotId, path },
      },
    });
    return row ? mapSnapshotFile(row) : null;
  },

  /**
   * Counts SnapshotFile rows for a snapshot.
   */
  async countFiles(snapshotId: string): Promise<number> {
    return db.snapshotFile.count({ where: { snapshotId } });
  },

  /**
   * Clears all snapshot and file rows (for tests).
   */
  async clear(): Promise<void> {
    await db.snapshotFile.deleteMany();
    await db.repoSnapshot.deleteMany();
  },
};
