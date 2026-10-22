import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/config/db";
import { createTestUser } from "./helpers/auth";

describe("Projects API", () => {
  beforeEach(async () => {
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  describe("POST /api/projects", () => {
    it("should create a project with 201 for valid input", async () => {
      const { agent } = await createTestUser("projects");

      const res = await agent
        .post("/api/projects")
        .send({
          name: "order-management-api",
          repositoryUrl: "https://github.com/example/orders",
          defaultBranch: "main",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe("order-management-api");
      expect(res.body.data.defaultBranch).toBe("main");
    });

    it("should return 422 with field errors when name is missing or too short", async () => {
      const { agent } = await createTestUser("projects");

      const res = await agent
        .post("/api/projects")
        .send({
          name: "a", // min is 2
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      const nameError = res.body.errors.find((e: any) => e.field === "name");
      expect(nameError).toBeDefined();
    });

    it("should return 422 when repositoryUrl is not https", async () => {
      const { agent } = await createTestUser("projects");

      const res = await agent
        .post("/api/projects")
        .send({
          name: "valid-name",
          repositoryUrl: "http://insecure-site.com",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      const urlError = res.body.errors.find((e: any) => e.field === "repositoryUrl");
      expect(urlError).toBeDefined();
    });

    it("should return 422 when unexpected extra fields are sent (strict schema)", async () => {
      const { agent } = await createTestUser("projects");

      const res = await agent
        .post("/api/projects")
        .send({
          name: "valid-name",
          unknownProperty: "should-fail",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/projects", () => {
    it("should return paginated list with correct metadata", async () => {
      const { agent } = await createTestUser("projects");

      await agent.post("/api/projects").send({ name: "Project 1" });
      await agent.post("/api/projects").send({ name: "Project 2" });

      const res = await agent.get("/api/projects?page=1&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });
  });
});
