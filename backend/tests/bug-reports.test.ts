import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/config/db";
import { createTestUser } from "./helpers/auth";

describe("Bug Reports API", () => {
  beforeEach(async () => {
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  describe("POST /api/bug-reports", () => {
    it("should create a bug report with 201 and initial status 'submitted'", async () => {
      const { agent } = await createTestUser("bugs");

      const project = await agent
        .post("/api/projects")
        .send({ name: "test-auth-app" });

      const res = await agent
        .post("/api/bug-reports")
        .send({
          projectId: project.body.data.id,
          title: "Login button disabled after form validation error",
          description: "When entering an invalid password then correcting it, the submit button remains disabled.",
          expectedBehavior: "The submit button should enable as soon as all input fields pass client-side regex check.",
          actualBehavior: "Button remains disabled until the whole page is refreshed manually.",
          affectedEndpoint: "POST /auth/login",
          stackTrace: "Error: button disabled state stuck",
          logs: "client form state: touched=true, errors=0",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe("submitted");
      expect(res.body.data.projectId).toBe(project.body.data.id);
    });

    it("should return 422 with field errors when required fields are missing", async () => {
      const { agent } = await createTestUser("bugs");

      const project = await agent
        .post("/api/projects")
        .send({ name: "test-auth-app" });

      const res = await agent
        .post("/api/bug-reports")
        .send({
          projectId: project.body.data.id,
          // title missing
          description: "A description that is valid length but missing title",
          expectedBehavior: "Expected behavior here",
          actualBehavior: "Actual behavior here",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      const titleError = res.body.errors.find((e: any) => e.field === "title");
      expect(titleError).toBeDefined();
    });

    it("should return 404 when projectId does not exist", async () => {
      const { agent } = await createTestUser("bugs");

      const res = await agent
        .post("/api/bug-reports")
        .send({
          projectId: "non-existent-project-id-12345",
          title: "Valid title for testing non-existent project",
          description: "Valid description for testing non-existent project",
          expectedBehavior: "Valid expected behavior for testing",
          actualBehavior: "Valid actual behavior for testing",
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("does not exist");
    });

    it("should return 422 when logs exceed 50,000 characters", async () => {
      const { agent } = await createTestUser("bugs");

      const project = await agent
        .post("/api/projects")
        .send({ name: "test-auth-app" });

      const oversizedLogs = "a".repeat(50001);

      const res = await agent
        .post("/api/bug-reports")
        .send({
          projectId: project.body.data.id,
          title: "Bug report with oversized logs payload",
          description: "Valid description for testing oversized logs",
          expectedBehavior: "Valid expected behavior for testing oversized logs",
          actualBehavior: "Valid actual behavior for testing oversized logs",
          logs: oversizedLogs,
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const logError = res.body.errors.find((e: any) => e.field === "logs");
      expect(logError).toBeDefined();
      expect(logError.message).toContain("50,000");
    });
  });

  describe("GET /api/bug-reports", () => {
    it("should return paginated list and filter by projectId", async () => {
      const { agent } = await createTestUser("bugs");

      const project = await agent
        .post("/api/projects")
        .send({ name: "test-auth-app" });

      await agent.post("/api/bug-reports").send({
        projectId: project.body.data.id,
        title: "Bug Report 1",
        description: "Description 1 with enough characters",
        expectedBehavior: "Expected 1",
        actualBehavior: "Actual 1",
      });

      const res = await agent.get(
        `/api/bug-reports?projectId=${project.body.data.id}&page=1&limit=5`
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
    });
  });
});
