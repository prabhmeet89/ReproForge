import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],

    // The test files share one SQLite database and each of them wipes the
    // repositories in beforeEach (projectsRepository.clear(), etc.). Running
    // them in parallel would let one file delete rows another file just
    // created, so they must run one after the other.
    fileParallelism: false,
  },
});
