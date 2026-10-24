import { describe, it, expect } from "vitest";
import {
  detectLanguage,
  detectFileKind,
  analyzeRepository,
} from "../src/modules/snapshots/snapshots.analysis";
import { FILE_KIND } from "../src/modules/snapshots/snapshots.constants";

describe("Snapshots Analysis & Classification", () => {
  describe("detectLanguage", () => {
    it("identifies standard programming and markup languages", () => {
      expect(detectLanguage("src/index.ts")).toBe("typescript");
      expect(detectLanguage("src/app.jsx")).toBe("javascript");
      expect(detectLanguage("server.mjs")).toBe("javascript");
      expect(detectLanguage("script.py")).toBe("python");
      expect(detectLanguage("main.go")).toBe("go");
      expect(detectLanguage("Cargo.toml")).toBe("toml");
      expect(detectLanguage("README.md")).toBe("markdown");
      expect(detectLanguage("unknown.xyz")).toBeNull();
    });
  });

  describe("detectFileKind", () => {
    it("classifies test files by path segments and filename patterns", () => {
      expect(detectFileKind("src/tests/auth.test.ts")).toBe(FILE_KIND.TEST);
      expect(detectFileKind("tests/unit/login.spec.js")).toBe(FILE_KIND.TEST);
      expect(detectFileKind("src/__tests__/utils.ts")).toBe(FILE_KIND.TEST);
      expect(detectFileKind("test/server.js")).toBe(FILE_KIND.TEST);
      expect(detectFileKind("src/service.spec.ts")).toBe(FILE_KIND.TEST);
    });

    it("classifies configuration and lockfiles as config", () => {
      expect(detectFileKind("package.json")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind("package-lock.json")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind("tsconfig.json")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind("tsconfig.build.json")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind("vite.config.ts")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind("jest.config.js")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind("Dockerfile")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind(".eslintrc.json")).toBe(FILE_KIND.CONFIG);
      expect(detectFileKind(".env.example")).toBe(FILE_KIND.CONFIG);
    });

    it("classifies documentation files as doc", () => {
      expect(detectFileKind("README.md")).toBe(FILE_KIND.DOC);
      expect(detectFileKind("docs/guide.markdown")).toBe(FILE_KIND.DOC);
    });

    it("classifies code files as source", () => {
      expect(detectFileKind("src/app.ts")).toBe(FILE_KIND.SOURCE);
      expect(detectFileKind("src/controller.js")).toBe(FILE_KIND.SOURCE);
      expect(detectFileKind("api/main.py")).toBe(FILE_KIND.SOURCE);
    });

    it("classifies assets and unknown extensions as other", () => {
      expect(detectFileKind("assets/data.csv")).toBe(FILE_KIND.OTHER);
      expect(detectFileKind("notes.txt")).toBe(FILE_KIND.OTHER);
    });
  });

  describe("analyzeRepository", () => {
    it("analyzes a supported Express + Jest + Supertest project", () => {
      const packageJson = JSON.stringify({
        name: "my-express-app",
        type: "module",
        engines: { node: ">=18.0.0" },
        main: "dist/index.js",
        dependencies: {
          express: "^4.19.2",
        },
        devDependencies: {
          jest: "^29.7.0",
          supertest: "^7.0.0",
          typescript: "^5.4.0",
        },
        scripts: {
          start: "node dist/index.js",
          test: "jest",
          dev: "tsx watch src/index.ts",
        },
      });

      const files = [
        { path: "package.json", kind: FILE_KIND.CONFIG },
        { path: "package-lock.json", kind: FILE_KIND.CONFIG },
        { path: "src/index.ts", kind: FILE_KIND.SOURCE },
        { path: "tests/index.test.ts", kind: FILE_KIND.TEST },
      ];

      const analysis = analyzeRepository(packageJson, files);

      expect(analysis.hasPackageJson).toBe(true);
      expect(analysis.name).toBe("my-express-app");
      expect(analysis.nodeEngine).toBe(">=18.0.0");
      expect(analysis.moduleSystem).toBe("esm");
      expect(analysis.typescript).toBe(true);
      expect(analysis.framework).toEqual({
        name: "express",
        version: "^4.19.2",
        detected: true,
      });
      expect(analysis.testFramework).toBe("jest");
      expect(analysis.testLibraries).toContain("supertest");
      expect(analysis.scripts.test).toBe("jest");
      expect(analysis.scripts.start).toBe("node dist/index.js");
      expect(analysis.packageManager).toBe("npm");
      expect(analysis.sourceFileCount).toBe(1);
      expect(analysis.testFileCount).toBe(1);
      expect(analysis.monorepo).toBe(false);
      expect(analysis.supported).toBe(true);
      expect(analysis.unsupportedReasons).toHaveLength(0);
    });

    it("analyzes a supported Express + Vitest project", () => {
      const packageJson = JSON.stringify({
        name: "vitest-api",
        dependencies: {
          express: "4.18.2",
        },
        devDependencies: {
          vitest: "^1.5.0",
        },
        scripts: {
          test: "vitest run",
        },
      });

      const files = [
        { path: "package.json" },
        { path: "yarn.lock" },
        { path: "src/server.js" },
        { path: "test/server.test.js" },
      ];

      const analysis = analyzeRepository(packageJson, files);

      expect(analysis.supported).toBe(true);
      expect(analysis.framework.detected).toBe(true);
      expect(analysis.testFramework).toBe("vitest");
      expect(analysis.packageManager).toBe("yarn");
      expect(analysis.moduleSystem).toBe("cjs"); // default when type not specified
    });

    it("handles missing package.json cleanly with clear reasons", () => {
      const files = [{ path: "main.py", kind: FILE_KIND.SOURCE }];
      const analysis = analyzeRepository(null, files);

      expect(analysis.hasPackageJson).toBe(false);
      expect(analysis.supported).toBe(false);
      expect(analysis.unsupportedReasons).toContain(
        "Root package.json was not found in archive"
      );
    });

    it("detects monorepos and marks them unsupported with clear reason", () => {
      const packageJson = JSON.stringify({
        name: "root-monorepo",
        workspaces: ["packages/*"],
        dependencies: {
          express: "^4.19.0",
        },
        devDependencies: {
          jest: "^29.0.0",
        },
      });

      const analysis = analyzeRepository(packageJson, [
        { path: "package.json" },
      ]);

      expect(analysis.monorepo).toBe(true);
      expect(analysis.supported).toBe(false);
      expect(analysis.unsupportedReasons).toContain(
        "Monorepos are currently not supported"
      );
    });

    it("handles invalid JSON in package.json without crashing", () => {
      const invalidJson = "{ name: 'broken', invalid: json }";
      const analysis = analyzeRepository(invalidJson, [
        { path: "package.json" },
      ]);

      expect(analysis.hasPackageJson).toBe(true);
      expect(analysis.supported).toBe(false);
      expect(analysis.unsupportedReasons).toContain(
        "Invalid JSON in root package.json"
      );
    });

    it("flags missing test framework and non-express frameworks", () => {
      const packageJson = JSON.stringify({
        name: "fastify-app",
        dependencies: {
          fastify: "^4.0.0",
        },
      });

      const analysis = analyzeRepository(packageJson, [
        { path: "package.json" },
      ]);

      expect(analysis.supported).toBe(false);
      expect(analysis.unsupportedReasons).toEqual(
        expect.arrayContaining([
          "Only Express.js web applications are currently supported",
          "A supported test framework (Jest, Vitest, Mocha, or node:test) was not detected",
        ])
      );
    });
  });
});
