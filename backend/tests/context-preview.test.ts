import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../src/config/db";
import { createTestUser } from "./helpers/auth";
import fs from "fs/promises";
import path from "path";

describe("Context Preview API", () => {
  let sampleFixture: any;

  beforeEach(async () => {
    await db.snapshotFile.deleteMany();
    await db.repoSnapshot.deleteMany();
    await db.bugReport.deleteMany();
    await db.project.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();

    const fixturePath = path.resolve(__dirname, "../../samples/payment-order-bug.bugreport.json");
    const fixtureData = await fs.readFile(fixturePath, "utf8");
    sampleFixture = JSON.parse(fixtureData);
  });

  it("completes full context-preview flow with sample ingestion and snapshot attachment", async () => {
    const { agent } = await createTestUser("preview-user");

    // 1. Create a project
    const projRes = await agent.post("/api/projects").send({ name: "Payment Service" });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.data.id;

    // 2. Ingest the sample snapshot
    const sampleRes = await agent
      .post(`/api/projects/${projectId}/snapshots/sample`)
      .send({ sampleName: "payment-order-bug", label: "Payment sample v1" });

    expect([200, 201]).toContain(sampleRes.status);
    expect(sampleRes.body.success).toBe(true);
    const snapshotId = sampleRes.body.data.id;
    expect(snapshotId).toBeDefined();

    // 3. Create a bug report without snapshot attached
    const bugRes = await agent.post("/api/bug-reports").send({
      projectId,
      title: sampleFixture.title,
      description: sampleFixture.description,
      expectedBehavior: sampleFixture.expectedBehavior,
      actualBehavior: sampleFixture.actualBehavior,
      affectedEndpoint: sampleFixture.affectedEndpoint,
      stackTrace: sampleFixture.stackTrace,
      logs: sampleFixture.logs,
    });
    expect(bugRes.status).toBe(201);
    const bugReportId = bugRes.body.data.id;

    // 4. Verify preview fails with 400 when snapshot is not attached yet
    const prePreviewRes = await agent.get(`/api/bug-reports/${bugReportId}/context-preview`);
    expect(prePreviewRes.status).toBe(400);

    // 5. Attach snapshot via PATCH /api/bug-reports/:id/snapshot
    const attachRes = await agent
      .patch(`/api/bug-reports/${bugReportId}/snapshot`)
      .send({ snapshotId });
    expect(attachRes.status).toBe(200);
    expect(attachRes.body.data.snapshotId).toBe(snapshotId);

    // 6. Request Context Preview
    const previewRes = await agent.get(`/api/bug-reports/${bugReportId}/context-preview`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.success).toBe(true);

    const preview = previewRes.body.data;

    // Snapshot metadata
    expect(preview.snapshot.id).toBe(snapshotId);
    expect(preview.snapshot.contentHash).toBeDefined();

    // Parsed stack
    expect(preview.parsedStack.errorType).toBe("Error");
    expect(preview.parsedStack.message).toContain("Payment amount 59.97 does not match order total");
    expect(preview.parsedStack.frames.length).toBeGreaterThan(0);

    // Matched frames
    expect(preview.matchedFrames.length).toBeGreaterThan(0);
    const ordersFrame = preview.matchedFrames.find(
      (mf: any) => mf.matchedPath === "src/orders.js"
    );
    expect(ordersFrame).toBeDefined();
    expect(ordersFrame.matchStatus).toBe("matched");

    const appFrame = preview.matchedFrames.find(
      (mf: any) => mf.matchedPath === "src/app.js"
    );
    expect(appFrame).toBeDefined();
    expect(appFrame.matchStatus).toBe("matched");

    // Ranked files
    expect(preview.files.length).toBeGreaterThanOrEqual(2);
    const filePaths = preview.files.map((f: any) => f.path);
    expect(filePaths.slice(0, 2)).toEqual(
      expect.arrayContaining(["src/orders.js", "src/app.js"])
    );
    expect(filePaths).toContain("tests/orders.test.js");

    // Secret redaction check: Ensure "sk_test_..." is never returned
    const previewJson = JSON.stringify(preview);
    expect(previewJson).not.toContain("sk_test_notreal1234567890abcdefgh");

    // Bounds & method check
    expect(preview.method).toBe("heuristic");
    expect(preview.limitBytes).toBe(60 * 1024);
    expect(preview.totalBytes).toBeLessThanOrEqual(preview.limitBytes);
  });

  it("supports attaching snapshot directly on bug report creation", async () => {
    const { agent } = await createTestUser("direct-user");

    const projRes = await agent.post("/api/projects").send({ name: "Direct Project" });
    const projectId = projRes.body.data.id;

    const sampleRes = await agent
      .post(`/api/projects/${projectId}/snapshots/sample`)
      .send({});
    const snapshotId = sampleRes.body.data.id;

    const bugRes = await agent.post("/api/bug-reports").send({
      projectId,
      title: sampleFixture.title,
      description: sampleFixture.description,
      expectedBehavior: sampleFixture.expectedBehavior,
      actualBehavior: sampleFixture.actualBehavior,
      affectedEndpoint: sampleFixture.affectedEndpoint,
      stackTrace: sampleFixture.stackTrace,
      logs: sampleFixture.logs,
      snapshotId,
    });
    expect(bugRes.status).toBe(201);
    expect(bugRes.body.data.snapshotId).toBe(snapshotId);

    const previewRes = await agent.get(`/api/bug-reports/${bugRes.body.data.id}/context-preview`);
    expect(previewRes.status).toBe(200);
    const topFiles = previewRes.body.data.files.map((f: any) => f.path).slice(0, 2);
    expect(topFiles).toEqual(
      expect.arrayContaining(["src/orders.js", "src/app.js"])
    );
  });


  it("enforces ownership and rejects cross-user access", async () => {
    const { agent: userA } = await createTestUser("user-a");
    const { agent: userB } = await createTestUser("user-b");

    const projA = await userA.post("/api/projects").send({ name: "Project A" });
    const snapA = await userA
      .post(`/api/projects/${projA.body.data.id}/snapshots/sample`)
      .send({});
    const bugA = await userA.post("/api/bug-reports").send({
      projectId: projA.body.data.id,
      title: sampleFixture.title,
      description: sampleFixture.description,
      expectedBehavior: sampleFixture.expectedBehavior,
      actualBehavior: sampleFixture.actualBehavior,
      snapshotId: snapA.body.data.id,
    });

    // User B attempts to access User A's context preview
    const forbiddenPreview = await userB.get(
      `/api/bug-reports/${bugA.body.data.id}/context-preview`
    );
    expect(forbiddenPreview.status).toBe(404);

    // User B attempts to attach snapshot to User A's bug report
    const forbiddenAttach = await userB
      .patch(`/api/bug-reports/${bugA.body.data.id}/snapshot`)
      .send({ snapshotId: snapA.body.data.id });
    expect(forbiddenAttach.status).toBe(404);
  });
});
