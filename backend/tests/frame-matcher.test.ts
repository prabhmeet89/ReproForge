import { describe, it, expect } from "vitest";
import { matchFrames, type SnapshotFileInfo } from "../src/services/frameMatcher";
import type { StackFrame } from "../src/services/stackTraceParser";

describe("Frame Matcher", () => {
  const snapshotFiles: SnapshotFileInfo[] = [
    {
      path: "src/orders.js",
      lineCount: 100,
      size: 2500,
      language: "javascript",
      kind: "source",
    },
    {
      path: "src/app.js",
      lineCount: 50,
      size: 1200,
      language: "javascript",
      kind: "source",
    },
    {
      path: "packages/a/src/utils.js",
      lineCount: 80,
      size: 1800,
      language: "javascript",
      kind: "source",
    },
    {
      path: "packages/b/src/utils.js",
      lineCount: 80,
      size: 1800,
      language: "javascript",
      kind: "source",
    },
  ];

  it("matches project frames using longest path suffix", () => {
    const frames: StackFrame[] = [
      {
        raw: "at processPayment (/app/src/orders.js:78:11)",
        function: "processPayment",
        file: "/app/src/orders.js",
        line: 78,
        column: 11,
        kind: "project",
      },
      {
        raw: "at /app/src/app.js:29:20",
        function: "",
        file: "/app/src/app.js",
        line: 29,
        column: 20,
        kind: "project",
      },
    ];

    const matched = matchFrames(frames, snapshotFiles);
    expect(matched).toHaveLength(2);

    expect(matched[0]).toMatchObject({
      matchStatus: "matched",
      matchedPath: "src/orders.js",
    });
    expect(matched[0].lineWarning).toBeUndefined();


    expect(matched[1]).toMatchObject({
      matchStatus: "matched",
      matchedPath: "src/app.js",
    });
  });

  it("marks external frames as external without matching snapshot files", () => {
    const frames: StackFrame[] = [
      {
        raw: "at Layer.handle (/app/node_modules/express/lib/router/layer.js:95:5)",
        function: "Layer.handle",
        file: "/app/node_modules/express/lib/router/layer.js",
        line: 95,
        column: 5,
        kind: "node_modules",
      },
      {
        raw: "at node:internal/process/task_queues:95:5",
        function: "",
        file: "node:internal/process/task_queues",
        line: 95,
        column: 5,
        kind: "node_internal",
      },
    ];

    const matched = matchFrames(frames, snapshotFiles);
    expect(matched[0].matchStatus).toBe("external");
    expect(matched[0].matchedPath).toBeNull();
    expect(matched[1].matchStatus).toBe("external");
    expect(matched[1].matchedPath).toBeNull();
  });

  it("identifies ambiguous suffix matches and lists candidates", () => {
    const frames: StackFrame[] = [
      {
        raw: "at helper (/workspace/src/utils.js:10:5)",
        function: "helper",
        file: "/workspace/src/utils.js",
        line: 10,
        column: 5,
        kind: "project",
      },
    ];

    const matched = matchFrames(frames, snapshotFiles);
    expect(matched[0].matchStatus).toBe("ambiguous");
    expect(matched[0].matchedPath).toBeNull();
    expect(matched[0].candidates).toEqual(
      expect.arrayContaining(["packages/a/src/utils.js", "packages/b/src/utils.js"])
    );
  });

  it("marks unmatched frames as not_found", () => {
    const frames: StackFrame[] = [
      {
        raw: "at missing (/app/src/not-exist.js:1:1)",
        function: "missing",
        file: "/app/src/not-exist.js",
        line: 1,
        column: 1,
        kind: "project",
      },
    ];

    const matched = matchFrames(frames, snapshotFiles);
    expect(matched[0].matchStatus).toBe("not_found");
    expect(matched[0].matchedPath).toBeNull();
  });

  it("attaches line warning when frame line number exceeds file lineCount", () => {
    const frames: StackFrame[] = [
      {
        raw: "at processPayment (/app/src/orders.js:150:11)",
        function: "processPayment",
        file: "/app/src/orders.js",
        line: 150, // file has 100 lines
        column: 11,
        kind: "project",
      },
    ];

    const matched = matchFrames(frames, snapshotFiles);
    expect(matched[0].matchStatus).toBe("matched");
    expect(matched[0].matchedPath).toBe("src/orders.js");
    expect(matched[0].lineWarning).toContain("line out of range (frame line 150, file has 100 lines)");
  });

  it("handles Windows backslashes in frame files and manifest paths", () => {
    const frames: StackFrame[] = [
      {
        raw: "at processPayment (C:\\app\\src\\orders.js:50:5)",
        function: "processPayment",
        file: "C:/app/src/orders.js",
        line: 50,
        column: 5,
        kind: "project",
      },
    ];

    const matched = matchFrames(frames, snapshotFiles);
    expect(matched[0].matchStatus).toBe("matched");
    expect(matched[0].matchedPath).toBe("src/orders.js");
  });
});
