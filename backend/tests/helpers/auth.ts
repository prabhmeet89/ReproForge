import request from "supertest";
import app from "../../src/app";
import { env } from "../../src/config/env";
import { db } from "../../src/config/db";

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

/**
 * A supertest agent that keeps the session cookie between requests.
 *
 * `request.agent()` is what makes this an *agent* — it stores the cookie
 * the server set and replays it on the next call, exactly like a browser
 * would.
 */
export type AuthenticatedAgent = ReturnType<typeof request.agent>;

let counter = 0;

/**
 * Creates a user through the real signup endpoint and returns an agent
 * that is already logged in as them.
 *
 * The session cookie is the genuine one the server issued, so these
 * agents exercise the same path the browser does.
 */
export async function createTestUser(
  label: string = "user"
): Promise<{ user: TestUser; agent: AuthenticatedAgent }> {
  // A unique email per call — the users table has a unique constraint and
  // the tests create several of them.
  counter += 1;
  const email = `test-${label}-${counter}-${process.pid}@example.com`;
  const password = "correct-horse-battery-staple";

  const agent = request.agent(app);

  const res = await agent.post("/api/auth/signup").send({ email, password });

  if (res.status !== 201) {
    throw new Error(
      `Test signup failed with ${res.status}: ${JSON.stringify(res.body)}`
    );
  }

  // Confirm the cookie really landed on the agent.
  const cookies = agent.jar.getCookies({ domain: "127.0.0.1", path: "/", secure: false });
  const hasSession = cookies.some(
    (c) => c.name === env.SESSION_COOKIE_NAME && !!c.value
  );

  if (!hasSession) {
    throw new Error("Test signup did not set a session cookie on the agent");
  }

  return {
    user: { id: res.body.data.id, email: res.body.data.email, password },
    agent,
  };
}

/**
 * An agent with no session cookie — every protected route must reject it.
 */
export function createAnonymousAgent(): AuthenticatedAgent {
  return request.agent(app);
}

/**
 * Inserts a test run directly with Prisma, bypassing the API.
 *
 * Used to set up a row that the API itself cannot create yet.
 */
export async function insertTestRun(data: {
  bugReportId: string;
  status?: string;
  stdout?: string;
  isDemo?: boolean;
}): Promise<string> {
  const row = await db.testRun.create({
    data: {
      bugReportId: data.bugReportId,
      status: data.status ?? "passed",
      stdout: data.stdout ?? null,
      stderr: null,
      exitCode: 0,
      durationMs: 100,
      isDemo: data.isDemo ?? false,
    },
    select: { id: true },
  });

  return row.id;
}
