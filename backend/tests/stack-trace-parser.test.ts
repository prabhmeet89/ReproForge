import { describe, it, expect } from "vitest";
import { parseStackTrace } from "../src/services/stackTraceParser";

describe("Stack Trace Parser", () => {
  it("parses a standard V8 error header and project frames", () => {
    const raw = `Error: Payment amount 59.97 does not match order total 59.970000000000006
    at processPayment (/app/src/orders.js:78:11)
    at /app/src/app.js:29:20`;

    const parsed = parseStackTrace(raw);
    expect(parsed.errorType).toBe("Error");
    expect(parsed.message).toBe("Payment amount 59.97 does not match order total 59.970000000000006");
    expect(parsed.frames).toHaveLength(2);

    expect(parsed.frames[0]).toMatchObject({
      function: "processPayment",
      file: "/app/src/orders.js",
      line: 78,
      column: 11,
      kind: "project",
    });

    expect(parsed.frames[1]).toMatchObject({
      function: "",
      file: "/app/src/app.js",
      line: 29,
      column: 20,
      kind: "project",
    });
  });

  it("handles async, new, and aliased method frames", () => {
    const raw = `TypeError: Cannot read properties of null
    at async fetchOrders (/workspace/src/api.ts:10:4)
    at new OrderProcessor (/workspace/src/processor.ts:25:9)
    at Layer.handle [as handle_request] (/workspace/node_modules/express/lib/router/layer.js:95:5)`;

    const parsed = parseStackTrace(raw);
    expect(parsed.errorType).toBe("TypeError");
    expect(parsed.message).toBe("Cannot read properties of null");
    expect(parsed.frames).toHaveLength(3);

    expect(parsed.frames[0].function).toBe("fetchOrders");
    expect(parsed.frames[0].file).toBe("/workspace/src/api.ts");
    expect(parsed.frames[0].kind).toBe("project");

    expect(parsed.frames[1].function).toBe("OrderProcessor");
    expect(parsed.frames[1].file).toBe("/workspace/src/processor.ts");
    expect(parsed.frames[1].kind).toBe("project");

    expect(parsed.frames[2].function).toBe("Layer.handle");
    expect(parsed.frames[2].file).toBe("/workspace/node_modules/express/lib/router/layer.js");
    expect(parsed.frames[2].kind).toBe("node_modules");
  });

  it("classifies node_modules and node:internal frames properly", () => {
    const raw = `Error: Something failed
    at /app/src/main.js:5:1
    at /app/node_modules/lodash/lodash.js:100:15
    at node:internal/process/task_queues:95:5`;

    const parsed = parseStackTrace(raw);
    expect(parsed.frames[0].kind).toBe("project");
    expect(parsed.frames[1].kind).toBe("node_modules");
    expect(parsed.frames[2].kind).toBe("node_internal");
  });

  it("normalizes Windows paths and file:/// URIs", () => {
    const raw = `Error: Path issue
    at run (C:\\Users\\ReproForge\\src\\runner.ts:14:8)
    at file:///C:/Users/ReproForge/src/utils.mjs:30:12
    at file:///home/user/app/src/server.js:45:2`;

    const parsed = parseStackTrace(raw);
    expect(parsed.frames[0].file).toBe("C:/Users/ReproForge/src/runner.ts");
    expect(parsed.frames[0].line).toBe(14);
    expect(parsed.frames[0].column).toBe(8);

    expect(parsed.frames[1].file).toBe("C:/Users/ReproForge/src/utils.mjs");
    expect(parsed.frames[1].line).toBe(30);

    expect(parsed.frames[2].file).toBe("/home/user/app/src/server.js");
    expect(parsed.frames[2].line).toBe(45);
  });

  it("handles unparseable frames and empty input gracefully without throwing", () => {
    expect(() => parseStackTrace("")).not.toThrow();
    const empty = parseStackTrace("");
    expect(empty.errorType).toBe("");
    expect(empty.message).toBe("");
    expect(empty.frames).toEqual([]);

    const garbage = parseStackTrace("some random text without error or stack\n    just indent");
    expect(garbage.frames).toEqual([]);

    const nativeFrame = parseStackTrace(`Error: Native
    at Array.map (<anonymous>)`);
    expect(nativeFrame.frames).toHaveLength(1);
    expect(nativeFrame.frames[0].line).toBeNull();
  });
});
