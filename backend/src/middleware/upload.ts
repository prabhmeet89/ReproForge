/**
 * Multer middleware — streams the upload to disk, never into RAM.
 *
 * Only accepts a single field called "archive". The file lands in
 * STORAGE_DIR/tmp with a random name. The controller cleans it up
 * after ingestion (or on failure).
 */

import multer from "multer";
import path from "path";
import crypto from "crypto";
import { artifactStorage } from "../services/artifactStorage";

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    const tmp = artifactStorage.tmpDir();
    // Ensure the tmp dir exists before multer writes.
    artifactStorage
      .ensureDir(tmp)
      .then(() => cb(null, tmp))
      .catch((err) => cb(err, tmp));
  },
  filename(_req, _file, cb) {
    // Random name — avoids collisions and leaking the original filename.
    const name = crypto.randomBytes(16).toString("hex") + ".zip";
    cb(null, name);
  },
});

/**
 * Express middleware: parse multipart/form-data with a single "archive" field.
 * Max file size is enforced here by multer and doubled-checked later by
 * the ingestion pipeline with the real byte count.
 */
export function uploadArchive(maxBytes: number) {
  return multer({
    storage,
    limits: {
      fileSize: maxBytes,
      files: 1,
    },
    fileFilter(_req, file, cb) {
      // Reject non-zip MIME early, but the real check is magic bytes.
      const allowed = [
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
      ];
      if (!allowed.includes(file.mimetype)) {
        return cb(new Error("Only .zip archives are accepted"));
      }
      cb(null, true);
    },
  }).single("archive");
}
