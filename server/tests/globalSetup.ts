import { execSync } from "child_process";
import path from "path";

/**
 * Prepares the dedicated test database exactly once, before any test file
 * runs.
 *
 * This has to live in `globalSetup` rather than a per-file `setupFiles` entry:
 * vitest runs test files in parallel worker processes, so a per-file setup
 * would run `migrate deploy` several times concurrently and SQLite would
 * reject it with "database is locked".
 *
 * Relative SQLite paths are resolved against the prisma/ directory, so this
 * creates server/prisma/test.db.
 */
export const TEST_DATABASE_URL = "file:./test.db";

export default function setup() {
  const serverRoot = process.cwd();

  try {
    execSync(
      `node ${path.join(
        "node_modules",
        "prisma",
        "build",
        "index.js"
      )} migrate deploy --schema=prisma/schema.prisma`,
      {
        cwd: serverRoot,
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        stdio: "pipe",
        encoding: "utf8",
      }
    );
  } catch (error: any) {
    console.error("❌ Failed to prepare the test database.");
    console.error("stdout:", error.stdout);
    console.error("stderr:", error.stderr);
    throw error;
  }
}
