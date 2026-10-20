import { projectsRepository } from "../modules/projects/projects.repository";
import { bugReportsRepository } from "../modules/bug-reports/bug-reports.repository";
import { testRunsRepository } from "../modules/test-runs/test-runs.repository";

export interface SeedResult {
  /** True when the database already had data and the seed was skipped. */
  skipped: boolean;
  projects: number;
  bugReports: number;
  testRuns: number;
}

export interface SeedOptions {
  /**
   * Wipe existing rows before inserting the demo data.
   *
   * Off by default: the seed runs on server boot when SEED_DEMO_DATA=true, and
   * it must not destroy data you created yourself. Pass force = true only from
   * an explicit CLI invocation.
   */
  force?: boolean;
}

/**
 * Seeds the demo dataset (3 projects, 4 bug reports, 2 test runs) into the
 * database. Safe to call repeatedly — unless `force` is set, it leaves an
 * already-populated database untouched.
 */
export async function seedDemoData(options?: SeedOptions): Promise<SeedResult> {
  const force = options?.force ?? false;

  const existing = await projectsRepository.findAll({ limit: 1 });

  if (existing.total > 0 && !force) {
    console.log(
      `ℹ️  Database already contains ${existing.total} project(s) — skipping demo seed. ` +
        `Use "npm run db:seed -- --force" to wipe and reseed.`
    );
    return { skipped: true, projects: 0, bugReports: 0, testRuns: 0 };
  }

  console.log("🌱 Seeding demo data...");

  if (force) {
    // Clear in reverse dependency order. The schema also has ON DELETE CASCADE,
    // so this is belt-and-braces rather than the only line of defence.
    await testRunsRepository.clear();
    await bugReportsRepository.clear();
    await projectsRepository.clear();
  }

  // 1. Projects
  const project1 = await projectsRepository.create({
    name: "auth-service-express",
    repositoryUrl: "https://github.com/reproforge-demo/auth-service",
    defaultBranch: "main",
    isDemo: true,
  });

  const project2 = await projectsRepository.create({
    name: "payment-gateway-api",
    repositoryUrl: "https://github.com/reproforge-demo/payment-gateway",
    defaultBranch: "main",
    isDemo: true,
  });

  const project3 = await projectsRepository.create({
    name: "inventory-worker",
    repositoryUrl: "https://github.com/reproforge-demo/inventory-worker",
    defaultBranch: "develop",
    isDemo: true,
  });

  // 2. Bug Reports
  const bug1 = await bugReportsRepository.create({
    projectId: project1.id,
    title: "POST /login returns 500 when email has trailing space",
    description:
      "Sending a POST request to /login with valid user credentials but trailing whitespace in the email triggers an uncaught TypeError in the user lookup service.",
    expectedBehavior:
      "The email should either be trimmed automatically or return 400 Bad Request with a clear validation message.",
    actualBehavior:
      "Server crashes with 500 Internal Server Error due to unhandled undefined user record in bcrypt comparison.",
    affectedEndpoint: "POST /api/v1/auth/login",
    stackTrace: `TypeError: Cannot read properties of undefined (reading 'passwordHash')
    at AuthService.login (src/services/auth.ts:42:28)
    at async AuthController.login (src/controllers/auth.ts:18:22)`,
    logs: `[INFO] Received login request for user: test@example.com
[ERROR] Database lookup returned null for query { email: "test@example.com " }
[ERROR] Uncaught exception: Cannot read properties of undefined`,
    status: "reproduced",
    isDemo: true,
  });

  const bug2 = await bugReportsRepository.create({
    projectId: project1.id,
    title: "JWT refresh token rotation fails under race condition",
    description:
      "Concurrent refresh requests with the same refresh token cause both requests to invalidate the session unexpectedly.",
    expectedBehavior:
      "One request succeeds with a new token pair; the second request should either gracefully queue or fail with token expired.",
    actualBehavior:
      "Both requests invalidate the token family immediately, forcing the user to log in again.",
    affectedEndpoint: "POST /api/v1/auth/refresh",
    status: "investigating",
    isDemo: true,
  });

  const bug3 = await bugReportsRepository.create({
    projectId: project2.id,
    title: "Stripe webhook signature validation timeout on large payload",
    description:
      "When Stripe sends a bulk invoice update webhook, the raw body buffer parsing takes longer than 5 seconds.",
    expectedBehavior: "Webhook processes within 500ms and responds with 200 OK.",
    actualBehavior: "Gateway times out with 504 and Stripe retries repeatedly.",
    affectedEndpoint: "POST /api/v1/webhooks/stripe",
    status: "unverified",
    isDemo: true,
  });

  const bug4 = await bugReportsRepository.create({
    projectId: project3.id,
    title: "Redis queue consumer disconnects without acknowledgement",
    description:
      "Worker dies silently when payload size exceeds memory buffer limit, leaving the job stalled in active state indefinitely.",
    expectedBehavior: "Job should be moved to dead-letter queue after max retries.",
    actualBehavior:
      "Job stays in active queue forever blocking the queue pipeline.",
    status: "submitted",
    isDemo: true,
  });

  // 3. Test Runs (Demo)
  await testRunsRepository.create({
    bugReportId: bug1.id,
    status: "passed",
    exitCode: 1, // Non-zero exit code indicates reproduction test succeeded in triggering the failure
    durationMs: 1420,
    stdout: `PASS test/repro.spec.ts
  ● Reproduction Suite
    ✓ triggers 500 when email has trailing whitespace (420 ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Snapshots:   0 total
Time:        1.42 s`,
    stderr: "",
    isDemo: true,
  });

  await testRunsRepository.create({
    bugReportId: bug2.id,
    status: "running",
    isDemo: true,
  });

  const result: SeedResult = {
    skipped: false,
    projects: 3,
    bugReports: 4,
    testRuns: 2,
  };

  console.log(
    `✅ Demo data seeded successfully (${result.projects} projects, ${result.bugReports} bug reports, ${result.testRuns} test runs).`
  );

  return result;
}
