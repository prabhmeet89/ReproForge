import { seedDemoData } from "./seed";
import { db } from "../config/db";

/**
 * Standalone seed runner.
 *
 *   npm run db:seed            → seeds only if the database is empty
 *   npm run db:seed -- --force → wipes the data and reseeds
 */
async function main() {
  const force = process.argv.includes("--force");

  const result = await seedDemoData({ force });

  if (result.skipped) {
    console.log("ℹ️  Nothing was written.");
  } else {
    console.log(
      `📊 Seeded: ${result.projects} projects, ${result.bugReports} bug reports, ${result.testRuns} test runs.`
    );
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
