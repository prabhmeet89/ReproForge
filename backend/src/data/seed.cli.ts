import { seedDemoData } from "./seed";
import { db } from "../config/db";

/**
 * Standalone seed runner.
 *
 *   npm run db:seed            → seeds only if the demo data is missing
 *   npm run db:seed -- --force → wipes the demo rows and reseeds
 *
 * The seed needs DEMO_EMAIL and DEMO_PASSWORD in server/.env, and it
 * refuses to run when NODE_ENV=production.
 */
async function main() {
  const force = process.argv.includes("--force");

  const result = await seedDemoData({ force });

  if (result.skipped) {
    console.log("ℹ️  Nothing was written.");
  } else {
    console.log(
      `📊 Seeded for ${result.email}: ${result.projects} projects, ${result.bugReports} bug reports, ${result.testRuns} test runs.`
    );
    console.log(`🔑 You can log in with ${result.email} and the DEMO_PASSWORD from your .env.`);
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err.message || err);
  await db.$disconnect();
  process.exit(1);
});
