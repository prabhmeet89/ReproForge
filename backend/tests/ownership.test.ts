import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/config/db";
import {
  createTestUser,
  createAnonymousAgent,
  insertTestRun,
} from "./helpers/auth";

/**
 * The protected surface. Every one of these must reject an unauthenticated
 * request with a 401.
 */
const PROTECTED_ROUTES: { method: "get" | "post"; path: string }[] = [
  { method: "get", path: "/api/projects" },
  { method: "post", path: "/api/projects" },
  { method: "get", path: "/api/projects/some-project-id" },
  { method: "get", path: "/api/bug-reports" },
  { method: "post", path: "/api/bug-reports" },
  { method: "get", path: "/api/bug-reports/some-bug-id" },
  { method: "get", path: "/api/test-runs" },
  { method: "get", path: "/api/test-runs/some-run-id" },
  { method: "get", path: "/api/dashboard/summary" },
];

const VALID_BUG_REPORT = {
  title: "Login button stays disabled after a validation error",
  description: "When the password is corrected the submit button stays disabled.",
  expectedBehavior: "The submit button should enable as soon as the field is valid.",
  actualBehavior: "The button stays disabled until the page is reloaded.",
};

describe("Ownership and access control", () => {
  beforeEach(async () => {
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  describe("Unauthenticated requests", () => {
    it("should return 401 on every protected route", async () => {
      const agent = createAnonymousAgent();

      for (const route of PROTECTED_ROUTES) {
        const res = await agent[route.method](route.path).send({});

        expect(
          res.status,
          `${route.method.toUpperCase()} ${route.path} should be 401`
        ).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });

    it("should leave the public routes open", async () => {
      const agent = createAnonymousAgent();

      const health = await agent.get("/api/health");
      expect(health.status).toBe(200);

      const signup = await agent.post("/api/auth/signup").send({
        email: "public-route@example.com",
        password: "correct-horse-battery-staple",
      });
      expect(signup.status).toBe(201);
    });
  });

  describe("Cross-user access (IDOR)", () => {
    it("should return 404 when user B reads user A's project by id", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const created = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      expect(created.status).toBe(201);
      const projectId = created.body.data.id;

      // The owner can read it.
      const ownerRead = await a.agent.get(`/api/projects/${projectId}`);
      expect(ownerRead.status).toBe(200);

      // Somebody else cannot — and gets 404, not 403, so the response does
      // not confirm the project exists.
      const otherRead = await b.agent.get(`/api/projects/${projectId}`);
      expect(otherRead.status).toBe(404);
      expect(otherRead.body.success).toBe(false);
    });

    it("should not include user A's projects in user B's list", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      await a.agent.post("/api/projects").send({ name: "alpha-project" });
      await a.agent.post("/api/projects").send({ name: "beta-project" });
      await b.agent.post("/api/projects").send({ name: "gamma-project" });

      const listA = await a.agent.get("/api/projects");
      const listB = await b.agent.get("/api/projects");

      expect(listA.body.data).toHaveLength(2);
      expect(listB.body.data).toHaveLength(1);
      expect(listB.body.data[0].name).toBe("gamma-project");
      expect(listB.body.meta.total).toBe(1);

      const namesB = listB.body.data.map((p: any) => p.name);
      expect(namesB).not.toContain("alpha-project");
      expect(namesB).not.toContain("beta-project");
    });

    it("should return 404 when user B reads user A's bug report by id", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const report = await a.agent
        .post("/api/bug-reports")
        .send({ ...VALID_BUG_REPORT, projectId: project.body.data.id });

      expect(report.status).toBe(201);
      const reportId = report.body.data.id;

      const ownerRead = await a.agent.get(`/api/bug-reports/${reportId}`);
      expect(ownerRead.status).toBe(200);

      const otherRead = await b.agent.get(`/api/bug-reports/${reportId}`);
      expect(otherRead.status).toBe(404);
    });

    it("should not include user A's bug reports in user B's list", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      await a.agent
        .post("/api/bug-reports")
        .send({ ...VALID_BUG_REPORT, projectId: project.body.data.id });

      const listB = await b.agent.get("/api/bug-reports");
      expect(listB.body.data).toHaveLength(0);
      expect(listB.body.meta.total).toBe(0);
    });

    it("should return 404 when user B creates a bug report on user A's project", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const res = await b.agent.post("/api/bug-reports").send({
        ...VALID_BUG_REPORT,
        projectId: project.body.data.id,
      });

      // 404, and the message does not distinguish "not yours" from
      // "does not exist".
      expect(res.status).toBe(404);
      expect(res.body.message).toContain("does not exist");
    });

    it("should return the same 404 for a non-existent project", async () => {
      const b = await createTestUser("b");

      const res = await b.agent.post("/api/bug-reports").send({
        ...VALID_BUG_REPORT,
        projectId: "no-such-project-id",
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain("does not exist");
    });

    it("should not expose user A's test runs to user B", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const report = await a.agent
        .post("/api/bug-reports")
        .send({ ...VALID_BUG_REPORT, projectId: project.body.data.id });

      // The test run row is inserted directly, because the API has no
      // endpoint for creating one yet.
      const runId = await insertTestRun({
        bugReportId: report.body.data.id,
        status: "passed",
        stdout: "secret output of user A",
      });

      const ownerRead = await a.agent.get(`/api/test-runs/${runId}`);
      expect(ownerRead.status).toBe(200);

      const otherRead = await b.agent.get(`/api/test-runs/${runId}`);
      expect(otherRead.status).toBe(404);
      expect(JSON.stringify(otherRead.body)).not.toContain("secret output of user A");

      const listB = await b.agent.get("/api/test-runs");
      expect(listB.body.data).toHaveLength(0);
      expect(JSON.stringify(listB.body)).not.toContain("secret output of user A");
    });

    it("should not include user A's test runs in user B's list", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const report = await a.agent
        .post("/api/bug-reports")
        .send({ ...VALID_BUG_REPORT, projectId: project.body.data.id });

      await insertTestRun({ bugReportId: report.body.data.id });

      const listA = await a.agent.get("/api/test-runs");
      const listB = await b.agent.get("/api/test-runs");

      expect(listA.body.data).toHaveLength(1);
      expect(listB.body.data).toHaveLength(0);
    });

    it("should return 404 when user B filters by user A's projectId", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const res = await b.agent.get(`/api/bug-reports?projectId=${project.body.data.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });
  });

  describe("Dashboard scoping", () => {
    it("should count only the current user's data", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const projectA = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      await a.agent
        .post("/api/bug-reports")
        .send({ ...VALID_BUG_REPORT, projectId: projectA.body.data.id });

      await b.agent.post("/api/projects").send({ name: "user-b-project" });

      const summaryA = await a.agent.get("/api/dashboard/summary");
      const summaryB = await b.agent.get("/api/dashboard/summary");

      expect(summaryA.status).toBe(200);
      expect(summaryA.body.data.counts.projects).toBe(1);
      expect(summaryA.body.data.counts.bugReports).toBe(1);
      expect(summaryA.body.data.counts.submitted).toBe(1);
      expect(summaryA.body.data.recentBugReports).toHaveLength(1);

      expect(summaryB.body.data.counts.projects).toBe(1);
      expect(summaryB.body.data.counts.bugReports).toBe(0);
      expect(summaryB.body.data.counts.submitted).toBe(0);
      expect(summaryB.body.data.recentBugReports).toHaveLength(0);
    });
  });

  describe("Mass assignment", () => {
    it("should reject ownerId in a project body with 422", async () => {
      const a = await createTestUser("a");

      const res = await a.agent.post("/api/projects").send({
        name: "attempted-ownership-override",
        ownerId: "someone-elses-id",
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("should reject isDemo in a project body with 422", async () => {
      const a = await createTestUser("a");

      const res = await a.agent.post("/api/projects").send({
        name: "attempted-demo-flag",
        isDemo: true,
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("should reject ownerId in a bug report body with 422", async () => {
      const a = await createTestUser("a");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const res = await a.agent.post("/api/bug-reports").send({
        ...VALID_BUG_REPORT,
        projectId: project.body.data.id,
        ownerId: "someone-elses-id",
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("should reject isDemo in a bug report body with 422", async () => {
      const a = await createTestUser("a");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      const res = await a.agent.post("/api/bug-reports").send({
        ...VALID_BUG_REPORT,
        projectId: project.body.data.id,
        isDemo: true,
      });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it("should not let the owner field be used to steal a project", async () => {
      const a = await createTestUser("a");
      const b = await createTestUser("b");

      const project = await a.agent
        .post("/api/projects")
        .send({ name: "user-a-project" });

      // The attempt is rejected by the schema...
      const attempt = await b.agent.post("/api/projects").send({
        name: "stolen-project",
        ownerId: a.user.id,
      });
      expect(attempt.status).toBe(422);

      // ...and A still owns the original.
      const stillMine = await a.agent.get(`/api/projects/${project.body.data.id}`);
      expect(stillMine.status).toBe(200);
    });
  });

  describe("Pagination, sorting and filtering", () => {
    it("should return correct pagination metadata", async () => {
      const a = await createTestUser("a");

      for (let i = 0; i < 5; i += 1) {
        await a.agent.post("/api/projects").send({ name: `project-${i}` });
      }

      const res = await a.agent.get("/api/projects?page=1&limit=2");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it("should default the limit to 10", async () => {
      const a = await createTestUser("a");

      for (let i = 0; i < 12; i += 1) {
        await a.agent.post("/api/projects").send({ name: `project-${i}` });
      }

      const res = await a.agent.get("/api/projects");

      expect(res.body.meta.limit).toBe(10);
      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta.total).toBe(12);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it("should cap the limit at 50", async () => {
      const a = await createTestUser("a");

      const res = await a.agent.get("/api/projects?limit=500");

      expect(res.status).toBe(200);
      expect(res.body.meta.limit).toBe(50);
    });

    it("should return 422 for an invalid sort field", async () => {
      const a = await createTestUser("a");

      const projects = await a.agent.get("/api/projects?sort=dropTable");
      expect(projects.status).toBe(422);
      expect(projects.body.success).toBe(false);

      const bugReports = await a.agent.get("/api/bug-reports?sort=notASort");
      expect(bugReports.status).toBe(422);

      const testRuns = await a.agent.get("/api/test-runs?sort=whatever");
      expect(testRuns.status).toBe(422);
    });

    it("should accept a whitelisted sort field", async () => {
      const a = await createTestUser("a");

      await a.agent.post("/api/projects").send({ name: "aaa-project" });
      await a.agent.post("/api/projects").send({ name: "zzz-project" });

      const res = await a.agent.get("/api/projects?sort=name");

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe("aaa-project");
    });

    it("should search projects case-insensitively", async () => {
      const a = await createTestUser("a");

      await a.agent.post("/api/projects").send({ name: "AuthService-Express" });

      const lower = await a.agent.get("/api/projects?search=authservice");
      const upper = await a.agent.get("/api/projects?search=AUTHSERVICE");

      expect(lower.body.data).toHaveLength(1);
      expect(upper.body.data).toHaveLength(1);
    });

    it("should reject an invalid status filter with 422", async () => {
      const a = await createTestUser("a");

      const res = await a.agent.get("/api/bug-reports?status=not-a-status");

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });
});
