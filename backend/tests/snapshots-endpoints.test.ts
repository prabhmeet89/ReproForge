import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { db } from "../src/config/db";
import { createTestUser } from "./helpers/auth";
import { artifactStorage } from "../src/services/artifactStorage";
import yazl from "yazl";

function createZipBuffer(
  files: Record<string, string | Buffer>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    const chunks: Buffer[] = [];
    zip.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
    zip.outputStream.on("error", reject);

    for (const [filePath, content] of Object.entries(files)) {
      const buf =
        typeof content === "string" ? Buffer.from(content, "utf8") : content;
      zip.addBuffer(buf, filePath);
    }
    zip.end();
  });
}

describe("Snapshots File Browsing & Security Endpoints", () => {
  beforeEach(async () => {
    await db.snapshotFile.deleteMany();
    await db.repoSnapshot.deleteMany();
    await db.project.deleteMany();
    await db.session.deleteMany();
    await db.user.deleteMany();
  });

  it("completes full Step 3B ingestion, secret exclusion/redaction, and browsing flow", async () => {
    const { user: owner, agent: ownerAgent } = await createTestUser("owner");

    // 1. Create a project
    const projRes = await ownerAgent.post("/api/projects").send({
      name: "express-sample-service",
      repositoryUrl: "https://github.com/example/express-sample",
      defaultBranch: "main",
    });
    expect(projRes.status).toBe(201);
    const projectId = projRes.body.data.id;

    // Build fake secrets dynamically at runtime
    const fakeStripeSecret = "sk_live_" + "1234567890abcdefghijklmnopqrstuv";
    const fakeGenericPassword = "superSecretPassword12345";

    // 2. Build a ZIP archive
    // - package.json (Express + Jest + supertest)
    // - .env (MUST be excluded)
    // - .env.example (MUST be stored and redacted)
    // - src/index.js with an inlined secret
    // - tests/app.test.js
    // - large.txt (> 200 KB)
    const packageJsonContent = JSON.stringify({
      name: "express-sample-service",
      type: "module",
      dependencies: {
        express: "^4.19.2",
      },
      devDependencies: {
        jest: "^29.7.0",
        supertest: "^7.0.0",
      },
      scripts: {
        test: "jest",
        start: "node src/index.js",
      },
    });

    const envContent = `STRIPE_KEY=${fakeStripeSecret}\nDB_PASS=rawSecret123`;
    const envExampleContent = `STRIPE_KEY=your_key_here\nSECRET_KEY="${fakeGenericPassword}"`;
    const srcIndexContent = [
      "import express from 'express';",
      "const app = express();",
      `const adminToken = "${fakeGenericPassword}";`,
      "export default app;",
    ].join("\n");
    const testContent = "describe('app', () => { it('works', () => {}); });";

    // Generate large text file exceeding 200 KB with varied text to stay within compression ratio limits
    let largeContent = "";
    for (let i = 0; i < 5000; i++) {
      largeContent += `Line ${i}: realistic test log output content padding hash ${i * 7919 % 100000}\n`;
    }

    const zipBuffer = await createZipBuffer({
      "package.json": packageJsonContent,
      ".env": envContent,
      ".env.example": envExampleContent,
      "src/index.js": srcIndexContent,
      "tests/app.test.js": testContent,
      "large.txt": largeContent,
    });

    // 3. Upload snapshot
    const uploadRes = await ownerAgent
      .post(`/api/projects/${projectId}/snapshots`)
      .attach("archive", zipBuffer, "repo.zip")
      .field("label", "Initial Import");

    expect(uploadRes.status).toBe(201);
    const snapshot = uploadRes.body.data;
    const snapshotId = snapshot.id;

    expect(snapshot.status).toBe("ready");
    expect(snapshot.fileCount).toBe(5); // .env excluded, 5 files stored
    expect(snapshot.excludedCount).toBeGreaterThanOrEqual(1);

    // 4. Verify GET /api/snapshots/:id returns analysis and secret stats
    const getSnapshotRes = await ownerAgent.get(`/api/snapshots/${snapshotId}`);
    expect(getSnapshotRes.status).toBe(200);
    const fetched = getSnapshotRes.body.data;

    expect(fetched.analysis).toBeDefined();
    expect(fetched.analysis.hasPackageJson).toBe(true);
    expect(fetched.analysis.supported).toBe(true);
    expect(fetched.analysis.framework.name).toBe("express");
    expect(fetched.analysis.testFramework).toBe("jest");
    expect(fetched.analysis.testLibraries).toContain("supertest");
    expect(fetched.analysis.excludedSecretFiles).toContain(".env");
    expect(fetched.secretFindingCount).toBeGreaterThan(0);

    // 5. GET /api/snapshots/:id/files (list & filtering)
    const listAllRes = await ownerAgent.get(
      `/api/snapshots/${snapshotId}/files`
    );
    expect(listAllRes.status).toBe(200);
    expect(listAllRes.body.data).toHaveLength(5);
    expect(listAllRes.body.meta.total).toBe(5);

    // Verify .env was NEVER stored in DB manifest
    const paths = listAllRes.body.data.map((f: any) => f.path);
    expect(paths).not.toContain(".env");
    expect(paths).toContain(".env.example");
    expect(paths).toContain("package.json");
    expect(paths).toContain("src/index.js");
    expect(paths).toContain("tests/app.test.js");
    expect(paths).toContain("large.txt");

    // Filter by kind=test
    const listTestRes = await ownerAgent.get(
      `/api/snapshots/${snapshotId}/files?kind=test`
    );
    expect(listTestRes.status).toBe(200);
    expect(listTestRes.body.data).toHaveLength(1);
    expect(listTestRes.body.data[0].path).toBe("tests/app.test.js");

    // Filter by search=index
    const listSearchRes = await ownerAgent.get(
      `/api/snapshots/${snapshotId}/files?search=index`
    );
    expect(listSearchRes.status).toBe(200);
    expect(listSearchRes.body.data).toHaveLength(1);
    expect(listSearchRes.body.data[0].path).toBe("src/index.js");

    // 6. GET /api/snapshots/:id/files/content (read-time redaction)
    const contentRes = await ownerAgent.get(
      `/api/snapshots/${snapshotId}/files/content?path=src/index.js`
    );
    expect(contentRes.status).toBe(200);
    expect(contentRes.body.data.path).toBe("src/index.js");
    expect(contentRes.body.data.truncated).toBe(false);
    expect(contentRes.body.data.content).not.toContain(fakeGenericPassword);
    expect(contentRes.body.data.content).toContain(
      'const adminToken = "[REDACTED:generic_secret]";'
    );
    expect(contentRes.body.data.secretFindingCount).toBe(1);

    // Verify line count matches
    const originalLines = srcIndexContent.split("\n").length;
    const returnedLines = contentRes.body.data.content.split("\n").length;
    expect(returnedLines).toBe(originalLines);

    // 7. Large file truncation test (capped at 200 KB)
    const largeRes = await ownerAgent.get(
      `/api/snapshots/${snapshotId}/files/content?path=large.txt`
    );
    expect(largeRes.status).toBe(200);
    expect(largeRes.body.data.truncated).toBe(true);
    expect(Buffer.byteLength(largeRes.body.data.content, "utf8")).toBeLessThanOrEqual(
      200 * 1024
    );

    // 8. Path traversal security checks
    const traversalAttempts = [
      "../package.json",
      "..\\package.json",
      "%2e%2e/package.json",
      "/etc/passwd",
      "\\etc\\passwd",
      "C:\\Windows\\system.ini",
    ];

    for (const badPath of traversalAttempts) {
      const res = await ownerAgent.get(
        `/api/snapshots/${snapshotId}/files/content?path=${encodeURIComponent(
          badPath
        )}`
      );
      expect([404, 422]).toContain(res.status);
    }

    // 9. IDOR / Access Control
    const { agent: otherUserAgent } = await createTestUser("other");
    const otherGetRes = await otherUserAgent.get(
      `/api/snapshots/${snapshotId}`
    );
    expect(otherGetRes.status).toBe(404);

    const otherListRes = await otherUserAgent.get(
      `/api/snapshots/${snapshotId}/files`
    );
    expect(otherListRes.status).toBe(404);

    const otherContentRes = await otherUserAgent.get(
      `/api/snapshots/${snapshotId}/files/content?path=src/index.js`
    );
    expect(otherContentRes.status).toBe(404);

    // 10. Unauthenticated requests return 401
    const unauthListRes = await request(app).get(
      `/api/snapshots/${snapshotId}/files`
    );
    expect(unauthListRes.status).toBe(401);

    const unauthContentRes = await request(app).get(
      `/api/snapshots/${snapshotId}/files/content?path=src/index.js`
    );
    expect(unauthContentRes.status).toBe(401);

    // Clean up disk files
    await artifactStorage.deleteSnapshot(snapshotId);
  });
});
