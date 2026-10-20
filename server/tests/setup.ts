import { afterAll, beforeEach } from "vitest";

// The test suite wipes repositories between tests (projectsRepository.clear(),
// bugReportsRepository.clear()), so it MUST NOT run against the development
// database. Point Prisma at a dedicated throwaway file instead.
//
// The database itself is created and migrated once in tests/globalSetup.ts;
// this file only makes sure every test worker uses it.
process.env.DATABASE_URL = "file:./test.db";
process.env.NODE_ENV = "test";

/**
 * Clears the domain tables before every test.
 *
 * Deleting the users cascades to projects → bug reports → test runs, so this
 * gives every test a completely clean database.
 */
beforeEach(async () => {
  const { db } = await import("../src/config/db");
  await db.session.deleteMany();
  await db.user.deleteMany();
});

afterAll(async () => {
  // Release the SQLite connection so vitest can exit cleanly.
  const { db } = await import("../src/config/db");
  await db.$disconnect();
});
