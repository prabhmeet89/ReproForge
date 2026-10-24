import { describe, it, expect } from "vitest";
import {
  rankFiles,
  extractImports,
  resolveImport,
  type FileContent,
} from "../src/services/relevanceRanker";
import type { MatchedFrame } from "../src/services/frameMatcher";

describe("Relevance Ranker", () => {
  describe("import extraction and resolution", () => {
    it("extracts require and import statements", () => {
      const code = `
        const orders = require("./orders");
        const { helper } = require("../utils/helper");
        import express from "express"; // external
        import { config } from "./config";
        import "../side-effect";
      `;
      const imports = extractImports(code);
      expect(imports).toContain("./orders");
      expect(imports).toContain("../utils/helper");
      expect(imports).toContain("./config");
      expect(imports).toContain("../side-effect");
      expect(imports).not.toContain("express");
    });

    it("resolves relative imports with common file extensions", () => {
      const allPaths = new Set([
        "src/orders.js",
        "src/config.ts",
        "src/utils/index.js",
      ]);

      expect(resolveImport("src", "./orders", allPaths)).toBe("src/orders.js");
      expect(resolveImport("src", "./config", allPaths)).toBe("src/config.ts");
      expect(resolveImport("src", "./utils", allPaths)).toBe("src/utils/index.js");
      expect(resolveImport("src", "./unknown", allPaths)).toBeNull();
    });
  });

  describe("rankFiles scoring and bounds", () => {
    const fileContents: FileContent[] = [
      {
        path: "src/orders.js",
        language: "javascript",
        kind: "source",
        lineCount: 85,
        size: 2400,
        content: `// Orders module\nconst config = require("./config");\nfunction processPayment(amount) { if (amount !== 59.97) throw new Error(); }`,
      },
      {
        path: "src/app.js",
        language: "javascript",
        kind: "source",
        lineCount: 40,
        size: 1100,
        content: `// App module\nconst express = require("express");\nconst orders = require("./orders");\napp.post("/orders/:id/pay", (req, res) => {});`,
      },
      {
        path: "src/config.js",
        language: "javascript",
        kind: "source",
        lineCount: 20,
        size: 500,
        content: `module.exports = { currency: "USD" };`,
      },
      {
        path: "tests/orders.test.js",
        language: "javascript",
        kind: "test",
        lineCount: 60,
        size: 1500,
        content: `const orders = require("../src/orders");\ndescribe("orders", () => {});`,
      },
      {
        path: "package.json",
        language: "json",
        kind: "config",
        lineCount: 15,
        size: 350,
        content: `{\n  "name": "sample-orders",\n  "version": "1.0.0"\n}`,
      },
      {
        path: "docs/architecture.md",
        language: "markdown",
        kind: "doc",
        lineCount: 10,
        size: 200,
        content: `# Architecture\nSome irrelevant doc`,
      },
    ];

    const matchedFrames: MatchedFrame[] = [
      {
        frame: {
          raw: "at processPayment (/app/src/orders.js:78:11)",
          function: "processPayment",
          file: "/app/src/orders.js",
          line: 78,
          column: 11,
          kind: "project",
        },
        matchStatus: "matched",
        matchedPath: "src/orders.js",
      },
      {
        frame: {
          raw: "at /app/src/app.js:29:20",
          function: "",
          file: "/app/src/app.js",
          line: 29,
          column: 20,
          kind: "project",
        },
        matchStatus: "matched",
        matchedPath: "src/app.js",
      },
    ];

    it("ranks stack frame files at top and includes imported files, tests, and config", () => {
      const result = rankFiles(matchedFrames, fileContents, {
        affectedEndpoint: "POST /orders/:id/pay",
        logs: "Error at src/orders.js while calling /orders/1/pay",
        description: "Payment failure in orders",
      });

      expect(result.files.length).toBeGreaterThanOrEqual(4);
      const paths = result.files.map((f) => f.path);

      // Top files must be the stack frame files
      expect(paths[0]).toBe("src/orders.js");
      expect(paths[1]).toBe("src/app.js");

      // Test file importing orders.js or sharing basename should be ranked
      expect(paths).toContain("tests/orders.test.js");

      // Config imported by orders.js should be included
      expect(paths).toContain("src/config.js");

      // package.json should be included as context
      expect(paths).toContain("package.json");

      // Reasons should be populated
      const ordersFile = result.files.find((f) => f.path === "src/orders.js");
      expect(ordersFile?.reasons.some((r) => r.includes("stack frame"))).toBe(true);

      const testFile = result.files.find((f) => f.path === "tests/orders.test.js");
      expect(testFile?.reasons.some((r) => r.includes("test"))).toBe(true);

      expect(result.limitBytes).toBe(60 * 1024);
      expect(result.totalBytes).toBeLessThanOrEqual(result.limitBytes);
    });

    it("truncates large files with snippet windows and sets truncated flag", () => {
      // Create a file > 8KB (threshold for snippet)
      const bigLine = "const x = 1234567890;\n";
      const lines: string[] = [];
      for (let i = 1; i <= 500; i++) {
        lines.push(`/* line ${i} */ ${bigLine}`);
      }
      const largeContent = lines.join("");

      const largeFiles: FileContent[] = [
        {
          path: "src/large.js",
          language: "javascript",
          kind: "source",
          lineCount: 500,
          size: Buffer.byteLength(largeContent),
          content: largeContent,
        },
      ];

      const frames: MatchedFrame[] = [
        {
          frame: {
            raw: "at fn (/app/src/large.js:250:5)",
            function: "fn",
            file: "/app/src/large.js",
            line: 250,
            column: 5,
            kind: "project",
          },
          matchStatus: "matched",
          matchedPath: "src/large.js",
        },
      ];

      const result = rankFiles(frames, largeFiles, {});
      expect(result.files).toHaveLength(1);
      const file = result.files[0];

      expect(file.truncated).toBe(true);
      expect(file.ranges.length).toBeGreaterThan(0);
      expect(file.ranges[0].start).toBeGreaterThan(1);
      expect(file.ranges[0].end).toBeLessThan(500);
      expect(file.content).toContain("[lines");
    });

    it("respects MAX_FILES bounds (max 12 files)", () => {
      const manyFiles: FileContent[] = [];
      for (let i = 0; i < 20; i++) {
        manyFiles.push({
          path: `src/file${i}.js`,
          language: "javascript",
          kind: "source",
          lineCount: 10,
          size: 100,
          content: `console.log(${i});`,
        });
      }

      const frames: MatchedFrame[] = manyFiles.map((f, i) => ({
        frame: {
          raw: `at f${i} (/app/${f.path}:1:1)`,
          function: `f${i}`,
          file: `/app/${f.path}`,
          line: 1,
          column: 1,
          kind: "project",
        },
        matchStatus: "matched",
        matchedPath: f.path,
      }));

      const result = rankFiles(frames, manyFiles, {});
      expect(result.files.length).toBeLessThanOrEqual(12);
    });
  });
});
