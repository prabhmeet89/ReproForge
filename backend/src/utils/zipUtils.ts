import yazl from "yazl";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

/**
 * Creates a zip archive from a source directory.
 * Preserves relative paths and skips node_modules and .git by default.
 */
export async function zipDirectory(
  sourceDir: string,
  destZipPath: string,
  filter?: (relPath: string) => boolean
): Promise<void> {
  await fsp.mkdir(path.dirname(destZipPath), { recursive: true });

  return new Promise<void>((resolve, reject) => {
    const zipfile = new yazl.ZipFile();
    const outStream = fs.createWriteStream(destZipPath);

    outStream.on("close", () => resolve());
    outStream.on("error", reject);
    zipfile.outputStream.on("error", reject);
    zipfile.outputStream.pipe(outStream);

    async function walk(dir: string, baseDir: string) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

        if (entry.name === "node_modules" || entry.name === ".git") {
          continue;
        }

        if (filter && !filter(relPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walk(fullPath, baseDir);
        } else if (entry.isFile()) {
          zipfile.addFile(fullPath, relPath);
        }
      }
    }

    walk(sourceDir, sourceDir)
      .then(() => {
        zipfile.end();
      })
      .catch((err) => {
        reject(err);
      });
  });
}
