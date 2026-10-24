/**
 * Artifact storage — thin disk I/O wrapper.
 *
 * All snapshot files go under STORAGE_DIR. This is the ONE place
 * that owns the layout, so swapping to S3 later means changing
 * only this module.
 *
 * Layout:
 *   <STORAGE_DIR>/tmp/              — upload temp files (multer)
 *   <STORAGE_DIR>/snapshots/<id>/files/<relative-path>
 */

import fs from "fs/promises";
import path from "path";

const DEFAULT_STORAGE_DIR = path.join(process.cwd(), "storage");

function storageRoot(): string {
  return process.env.STORAGE_DIR || DEFAULT_STORAGE_DIR;
}

export const artifactStorage = {
  /** Absolute path to the tmp upload directory. */
  tmpDir(): string {
    return path.join(storageRoot(), "tmp");
  },

  /** Absolute path to a snapshot's file tree. */
  snapshotDir(snapshotId: string): string {
    return path.join(storageRoot(), "snapshots", snapshotId, "files");
  },

  /** Ensure a directory exists (recursive). */
  async ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  },

  /** Write a file, creating parent directories. */
  async saveFile(filePath: string, data: Buffer): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  },

  /** Remove an entire snapshot directory tree. Silently ignores "not found". */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    const dir = path.join(storageRoot(), "snapshots", snapshotId);
    await fs.rm(dir, { recursive: true, force: true });
  },

  /** Remove a single file. Silently ignores "not found". */
  async deleteFile(filePath: string): Promise<void> {
    await fs.rm(filePath, { force: true });
  },

  /** Check whether a path exists on disk. */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  },
};
