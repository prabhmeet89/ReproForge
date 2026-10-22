import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

describe("Unknown Routes", () => {
  it("should return 404 JSON response for nonexistent endpoint", async () => {
    const res = await request(app).get("/api/non-existent-endpoint-xyz");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("Route not found");
  });
});
