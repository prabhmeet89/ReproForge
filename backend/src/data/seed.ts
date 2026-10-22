import { db } from "../config/db";
import { env } from "../config/env";
import { hashPassword } from "../modules/auth/auth.crypto";

export interface SeedResult {
  /** True when the database already had data and the seed was skipped. */
  skipped: boolean;
  userId: string;
  email: string;
  projects: number;
  bugReports: number;
  testRuns: number;
}

export interface SeedOptions {
  /**
   * Wipe the demo rows before inserting the demo data.
   *
   * Off by default — the seed must never destroy data you created yourself.
   * Pass force = true only from an explicit CLI invocation.
   */
  force?: boolean;
}

/**
 * The demo data, in dependency order.
 *
 * It is plain data so the insert can be one transaction: either the whole
 * demo dataset lands, or none of it does.
 */
const DEMO_PROJECTS = [
  {
    name: "auth-service-express",
    repositoryUrl: "https://github.com/reproforge-demo/auth-service",
    defaultBranch: "main",
  },
  {
    name: "payment-gateway-api",
    repositoryUrl: "https://github.com/reproforge-demo/payment-gateway",
    defaultBranch: "main",
  },
  {
    name: "inventory-worker",
    repositoryUrl: "https://github.com/reproforge-demo/inventory-worker",
    defaultBranch: "develop",
  },
];

/**
 * Seeds the demo dataset into the database.
 *
 * This is a development-only tool. It refuses to run in production, it
 * needs an explicit password from the environment, and every write happens
 * inside a single transaction.
 */
export async function seedDemoData(options?: SeedOptions): Promise<SeedResult> {
  // The guard lives here, not only in the CLI, so that importing this
  // module and calling it from anywhere is safe.
  if (env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to seed demo data: NODE_ENV is 'production'. The demo seed is a development-only tool."
    );
  }

  const email = env.DEMO_EMAIL;
  const password = env.DEMO_PASSWORD;

  if (!email) {
    throw new Error(
      "DEMO_EMAIL is not set. Add it to server/.env (see .env.example) and run the seed again."
    );
  }

  if (!password) {
    throw new Error(
      "DEMO_PASSWORD is not set. Add it to server/.env (see .env.example) and run the seed again."
    );
  }

  if (password.length < 10) {
    throw new Error(
      "DEMO_PASSWORD must be at least 10 characters — the same rule the signup endpoint enforces."
    );
  }

  const force = options?.force ?? false;

  const existing = await db.project.count({
    where: { owner: { email } },
  });

  if (existing > 0 && !force) {
    console.log(
      `ℹ️  Demo data already exists for ${email} (${existing} project(s)) — skipping. ` +
        `Use "npm run db:seed -- --force" to wipe and reseed.`
    );
    return {
      skipped: true,
      userId: "",
      email,
      projects: 0,
      bugReports: 0,
      testRuns: 0,
    };
  }

  console.log(`🌱 Seeding demo data for ${email}...`);

  const passwordHash = await hashPassword(password);

  // The demo user, the projects, the bug reports and the test runs are one
  // unit: a failure anywhere rolls the whole thing back.
  const result = await db.$transaction(async (tx) => {
    if (force) {
      // Remove this user's demo rows in reverse dependency order. The
      // schema cascades too, so this is belt-and-braces.
      const existingProjects = await tx.project.findMany({
        where: { owner: { email } },
        select: { id: true },
      });
      const projectIds = existingProjects.map((p) => p.id);

      await tx.testRun.deleteMany({
        where: { bugReport: { projectId: { in: projectIds } } },
      });
      await tx.bugReport.deleteMany({ where: { projectId: { in: projectIds } } });
      await tx.project.deleteMany({ where: { id: { in: projectIds } } });
    }

    const user = await tx.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        name: email.split("@")[0] || "Demo User",
      },
      select: { id: true },
    });

    const projectIds: string[] = [];
    for (const project of DEMO_PROJECTS) {
      const row = await tx.project.create({
        data: {
          ownerId: user.id,
          name: project.name,
          repositoryUrl: project.repositoryUrl,
          defaultBranch: project.defaultBranch,
          isDemo: true,
        },
        select: { id: true },
      });
      projectIds.push(row.id);
    }

    const bugReports = [
      {
        projectIndex: 0,
        title: "POST /login returns 500 when email has trailing space",
        description:
          "Sending a POST request to /login with valid user credentials but trailing whitespace in the email triggers an uncaught TypeError in the user lookup service.",
        expectedBehavior:
          "The email should either be trimmed automatically or return 400 Bad Request with a clear validation message.",
        actualBehavior:
          "Server crashes with 500 Internal Server Error due to unhandled undefined user record in bcrypt comparison.",
        affectedEndpoint: "POST /api/v1/auth/login",
        status: "reproduced",
      },
      {
        projectIndex: 0,
        title: "JWT refresh token rotation fails under race condition",
        description:
          "Concurrent refresh requests with the same refresh token cause both requests to invalidate the session unexpectedly.",
        expectedBehavior:
          "One request succeeds with a new token pair; the second request should either gracefully queue or fail with token expired.",
        actualBehavior:
          "Both requests invalidate the token family immediately, forcing the user to log in again.",
        affectedEndpoint: "POST /api/v1/auth/refresh",
        status: "investigating",
      },
      {
        projectIndex: 1,
        title: "Stripe webhook signature validation timeout on large payload",
        description:
          "When Stripe sends a bulk invoice update webhook, the raw body buffer parsing takes longer than 5 seconds.",
        expectedBehavior: "Webhook processes within 500ms and responds with 200 OK.",
        actualBehavior: "Gateway times out with 504 and Stripe retries repeatedly.",
        affectedEndpoint: "POST /api/v1/webhooks/stripe",
        status: "unverified",
      },
      {
        projectIndex: 2,
        title: "Redis queue consumer disconnects without acknowledgement",
        description:
          "Worker dies silently when payload size exceeds memory buffer limit, leaving the job stalled in active state indefinitely.",
        expectedBehavior: "Job should be moved to dead-letter queue after max retries.",
        actualBehavior: "Job stays in active queue forever blocking the queue pipeline.",
        status: "submitted",
      },
    ];

    const bugReportIds: string[] = [];
    for (const bug of bugReports) {
      const row = await tx.bugReport.create({
        data: {
          ownerId: user.id,
          projectId: projectIds[bug.projectIndex],
          title: bug.title,
          description: bug.description,
          expectedBehavior: bug.expectedBehavior,
          actualBehavior: bug.actualBehavior,
          affectedEndpoint: bug.affectedEndpoint,
          status: bug.status,
          isDemo: true,
        },
        select: { id: true },
      });
      bugReportIds.push(row.id);
    }

    await tx.testRun.create({
      data: {
        bugReportId: bugReportIds[0],
        status: "passed",
        // A non-zero exit code means the reproduction test did trigger the
        // failure — which is the point of a reproduction test.
        exitCode: 1,
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
      },
    });

    await tx.testRun.create({
      data: {
        bugReportId: bugReportIds[1],
        status: "running",
        isDemo: true,
      },
    });

    return {
      userId: user.id,
      projects: projectIds.length,
      bugReports: bugReportIds.length,
      testRuns: 2,
    };
  });

  console.log(
    `✅ Demo data seeded (${result.projects} projects, ${result.bugReports} bug reports, ${result.testRuns} test runs).`
  );

  return {
    skipped: false,
    email,
    ...result,
  };
}
