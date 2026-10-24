/**
 * Pure functions for repository analysis and file classification.
 *
 * Safe: Never requires or executes untrusted code.
 * Deterministic: All outputs derived purely from the file manifest and file contents.
 */

import { FILE_KIND, FileKind } from "./snapshots.constants";

// ---------------------------------------------------------------------------
// Language & Kind Classification
// ---------------------------------------------------------------------------

const EXT_TO_LANGUAGE: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".json": "json",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".cs": "csharp",
  ".cpp": "cpp",
  ".c": "c",
  ".h": "c",
  ".hpp": "cpp",
  ".swift": "swift",
  ".php": "php",
  ".lua": "lua",
  ".sh": "shell",
  ".bash": "shell",
  ".ps1": "powershell",
  ".sql": "sql",
  ".r": "r",
  ".R": "r",
  ".html": "html",
  ".css": "css",
  ".scss": "scss",
  ".less": "less",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".md": "markdown",
  ".txt": "text",
};

export function detectLanguage(filePath: string): string | null {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return EXT_TO_LANGUAGE[ext] ?? null;
}

const TEST_PATH_REGEX = /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)/i;
const TEST_FILENAME_REGEX = /\.(?:test|spec)\.[a-z0-9]+$/i;

const CONFIG_BASENAMES = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example",
  ".env.sample",
  ".env.template",
  "makefile",
  "cmakelists.txt",
]);

export function detectFileKind(filePath: string): FileKind {
  const normalized = filePath.replace(/\\/g, "/");
  const basename = (normalized.split("/").pop() || "").toLowerCase();

  // 1. Test files
  if (TEST_PATH_REGEX.test(normalized) || TEST_FILENAME_REGEX.test(basename)) {
    return FILE_KIND.TEST;
  }

  // 2. Config files: exact match, tsconfig*, *.config.*, lockfiles, .eslintrc*, .prettierrc*
  if (
    CONFIG_BASENAMES.has(basename) ||
    basename.startsWith("tsconfig") ||
    basename.includes(".config.") ||
    basename.startsWith(".eslintrc") ||
    basename.startsWith(".prettierrc") ||
    basename.startsWith(".babelrc")
  ) {
    return FILE_KIND.CONFIG;
  }

  // 3. Documentation
  if (basename.endsWith(".md") || basename.endsWith(".markdown")) {
    return FILE_KIND.DOC;
  }

  // 4. Source code files
  const ext = basename.slice(basename.lastIndexOf(".")).toLowerCase();
  const lang = EXT_TO_LANGUAGE[ext];
  if (
    lang &&
    lang !== "markdown" &&
    lang !== "text" &&
    lang !== "json" &&
    lang !== "yaml" &&
    lang !== "toml" &&
    lang !== "xml"
  ) {
    return FILE_KIND.SOURCE;
  }

  return FILE_KIND.OTHER;
}

// ---------------------------------------------------------------------------
// Repository Analysis Types
// ---------------------------------------------------------------------------

export type ModuleSystem = "esm" | "cjs" | "unknown";
export type TestFramework = "jest" | "vitest" | "mocha" | "node:test" | "none";

export interface RepoAnalysis {
  hasPackageJson: boolean;
  name?: string;
  nodeEngine?: string;
  moduleSystem: ModuleSystem;
  typescript: boolean;
  framework: {
    name: string;
    version?: string;
    detected: boolean;
  };
  testFramework: TestFramework;
  testLibraries: string[];
  scripts: {
    test?: string;
    start?: string;
    dev?: string;
  };
  entryFile?: string;
  packageManager?: string;
  sourceFileCount: number;
  testFileCount: number;
  monorepo: boolean;
  supported: boolean;
  unsupportedReasons: string[];
  excludedSecretFiles?: string[];
}

export interface ManifestFileEntry {
  path: string;
  kind?: string;
}

// ---------------------------------------------------------------------------
// Package.json and Repository Analysis
// ---------------------------------------------------------------------------

export function analyzeRepository(
  packageJsonRaw: string | null | undefined,
  files: ManifestFileEntry[],
  excludedSecretFiles: string[] = []
): RepoAnalysis {
  let sourceFileCount = 0;
  let testFileCount = 0;
  let hasTsFiles = false;
  let packageManager: string | undefined;

  for (const f of files) {
    const kind = f.kind ?? detectFileKind(f.path);
    if (kind === FILE_KIND.SOURCE) sourceFileCount++;
    if (kind === FILE_KIND.TEST) testFileCount++;

    const lower = f.path.toLowerCase();
    if (lower.endsWith(".ts") || lower.endsWith(".tsx")) {
      hasTsFiles = true;
    }

    if (!packageManager) {
      if (lower.endsWith("package-lock.json")) packageManager = "npm";
      else if (lower.endsWith("yarn.lock")) packageManager = "yarn";
      else if (lower.endsWith("pnpm-lock.yaml")) packageManager = "pnpm";
      else if (lower.endsWith("bun.lockb")) packageManager = "bun";
    }
  }

  if (!packageJsonRaw) {
    return {
      hasPackageJson: false,
      moduleSystem: "unknown",
      typescript: hasTsFiles,
      framework: { name: "unknown", detected: false },
      testFramework: "none",
      testLibraries: [],
      scripts: {},
      sourceFileCount,
      testFileCount,
      monorepo: false,
      supported: false,
      unsupportedReasons: ["Root package.json was not found in archive"],
      excludedSecretFiles,
    };
  }

  let pkg: any;
  try {
    pkg = JSON.parse(packageJsonRaw);
  } catch (err) {
    return {
      hasPackageJson: true,
      moduleSystem: "unknown",
      typescript: hasTsFiles,
      framework: { name: "unknown", detected: false },
      testFramework: "none",
      testLibraries: [],
      scripts: {},
      sourceFileCount,
      testFileCount,
      monorepo: false,
      supported: false,
      unsupportedReasons: ["Invalid JSON in root package.json"],
      excludedSecretFiles,
    };
  }

  const unsupportedReasons: string[] = [];

  // Name
  const name = typeof pkg.name === "string" ? pkg.name : undefined;

  // Node engine
  const nodeEngine =
    pkg.engines && typeof pkg.engines.node === "string"
      ? pkg.engines.node
      : undefined;

  // Module system
  let moduleSystem: ModuleSystem = "unknown";
  if (pkg.type === "module") {
    moduleSystem = "esm";
  } else if (pkg.type === "commonjs") {
    moduleSystem = "cjs";
  } else if (pkg.type === undefined) {
    moduleSystem = "cjs"; // Node.js default when type is absent
  }

  // Monorepo check: workspaces field or lerna/pnpm-workspace
  const hasWorkspaces =
    Array.isArray(pkg.workspaces) ||
    (pkg.workspaces && Array.isArray(pkg.workspaces.packages));
  const hasLerna = Boolean(
    pkg.devDependencies?.lerna || pkg.dependencies?.lerna
  );
  const monorepo = Boolean(hasWorkspaces || hasLerna);
  if (monorepo) {
    unsupportedReasons.push("Monorepos are currently not supported");
  }

  // TypeScript check
  const hasTsDep = Boolean(
    pkg.devDependencies?.typescript || pkg.dependencies?.typescript
  );
  const typescript = hasTsFiles || hasTsDep;

  // Dependencies map
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

  // Framework detection (Express focus)
  const expressVer = deps["express"];
  const framework = {
    name: expressVer ? "express" : "unknown",
    version: typeof expressVer === "string" ? expressVer : undefined,
    detected: Boolean(expressVer),
  };
  if (!framework.detected) {
    unsupportedReasons.push("Only Express.js web applications are currently supported");
  }

  // Test framework detection
  let testFramework: TestFramework = "none";
  if (deps["vitest"]) {
    testFramework = "vitest";
  } else if (deps["jest"] || deps["ts-jest"]) {
    testFramework = "jest";
  } else if (deps["mocha"]) {
    testFramework = "mocha";
  } else if (
    pkg.scripts?.test &&
    typeof pkg.scripts.test === "string" &&
    pkg.scripts.test.includes("node --test")
  ) {
    testFramework = "node:test";
  }

  if (testFramework === "none") {
    unsupportedReasons.push("A supported test framework (Jest, Vitest, Mocha, or node:test) was not detected");
  }

  // Test libraries (e.g. supertest, @testing-library/react)
  const testLibraries: string[] = [];
  const candidateLibs = ["supertest", "chai", "sinon", "nock", "msw", "playwright", "cypress"];
  for (const lib of candidateLibs) {
    if (deps[lib]) {
      testLibraries.push(lib);
    }
  }

  // Scripts
  const scripts: { test?: string; start?: string; dev?: string } = {};
  if (pkg.scripts && typeof pkg.scripts === "object") {
    if (typeof pkg.scripts.test === "string") scripts.test = pkg.scripts.test;
    if (typeof pkg.scripts.start === "string") scripts.start = pkg.scripts.start;
    if (typeof pkg.scripts.dev === "string") scripts.dev = pkg.scripts.dev;
  }

  // Entry file
  let entryFile: string | undefined;
  if (typeof pkg.main === "string") {
    entryFile = pkg.main;
  } else if (typeof pkg.module === "string") {
    entryFile = pkg.module;
  }

  // Package manager from package.json if explicit (e.g. "packageManager": "npm@9.0.0")
  if (typeof pkg.packageManager === "string") {
    packageManager = pkg.packageManager.split("@")[0];
  }

  const supported = unsupportedReasons.length === 0;

  return {
    hasPackageJson: true,
    name,
    nodeEngine,
    moduleSystem,
    typescript,
    framework,
    testFramework,
    testLibraries,
    scripts,
    entryFile,
    packageManager,
    sourceFileCount,
    testFileCount,
    monorepo,
    supported,
    unsupportedReasons,
    excludedSecretFiles,
  };
}
