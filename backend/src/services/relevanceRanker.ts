/**
 * Deterministic relevance ranker for context preview.
 *
 * Signals (priority order):
 *   1. Stack frame match (first project frame scores highest)
 *   2. Imported/required by a frame file (one hop)
 *   3. Test file that imports a frame file or shares its base name
 *   4. File containing the bug report's affectedEndpoint string
 *   5. Paths mentioned in the logs or description
 *   6. package.json and test config (always included as "project context")
 *
 * Bounds:
 *   - Max 12 files
 *   - Max 60 KB total content
 *   - Per-file snippet: matched line ±40 lines for big files (whole
 *     file when under 8 KB)
 *   - Deterministic ordering
 */

import type { MatchedFrame } from "./frameMatcher";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileContent {
  path: string;
  language: string | null;
  kind: string;
  lineCount: number;
  size: number;
  content: string;
}

export interface RankedFile {
  path: string;
  language: string | null;
  kind: string;
  /** Why this file was included. */
  reasons: string[];
  /** Line ranges included in the snippet. */
  ranges: Array<{ start: number; end: number }>;
  /** The content snippet (possibly truncated). */
  content: string;
  /** True if content was truncated to fit bounds. */
  truncated: boolean;
}

export interface RankingResult {
  files: RankedFile[];
  totalBytes: number;
  limitBytes: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILES = 12;
const MAX_TOTAL_BYTES = 60 * 1024; // 60 KB
const SMALL_FILE_THRESHOLD = 8 * 1024; // 8 KB
const SNIPPET_RADIUS = 40; // lines above and below

/** Files always included as project context if they exist. */
const CONTEXT_FILES = new Set([
  "package.json",
  "jest.config.js",
  "jest.config.ts",
  "jest.config.mjs",
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mts",
  ".mocharc.yml",
  ".mocharc.json",
  "tsconfig.json",
]);

// ---------------------------------------------------------------------------
// Import extraction (regex, never executes code)
// ---------------------------------------------------------------------------

/**
 * Extracts relative import/require targets from file content.
 * Returns normalised paths (forward slashes, no extension).
 */
export function extractImports(content: string): string[] {
  const targets: string[] = [];

  // require("./x") or require('./x')
  const requireRe = /require\s*\(\s*["'](\.[^"']+)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = requireRe.exec(content)) !== null) {
    targets.push(m[1]);
  }

  // import ... from "./x" or import "./x"
  const importRe = /(?:import\s+.*?\s+from\s+|import\s+)["'](\.[^"']+)["']/g;
  while ((m = importRe.exec(content)) !== null) {
    targets.push(m[1]);
  }

  return targets.map((t) => t.replace(/\\/g, "/"));
}

/**
 * Resolves a relative import target against a source file's directory.
 * Tries common extensions and /index fallbacks.
 */
export function resolveImport(
  sourceDir: string,
  target: string,
  allPaths: Set<string>
): string | null {
  // Normalise
  const base = (sourceDir + "/" + target).replace(/\\/g, "/");
  // Clean up double slashes and /./ segments
  const normalized = base.replace(/\/+/g, "/").replace(/\/\.\//g, "/");

  // Try exact
  if (allPaths.has(normalized)) return normalized;

  // Try with extensions
  const exts = [".js", ".ts", ".mjs", ".jsx", ".tsx", ".cjs"];
  for (const ext of exts) {
    if (allPaths.has(normalized + ext)) return normalized + ext;
  }

  // Try /index variants
  for (const ext of exts) {
    if (allPaths.has(normalized + "/index" + ext)) {
      return normalized + "/index" + ext;
    }
  }

  return null;
}

function getDir(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  parts.pop();
  return parts.join("/");
}

function getBaseName(filePath: string): string {
  const name = filePath.replace(/\\/g, "/").split("/").pop() || "";
  // Strip all extensions: "foo.test.ts" → "foo"
  return name.replace(/\..+$/, "");
}

// ---------------------------------------------------------------------------
// Snippet extraction
// ---------------------------------------------------------------------------

function extractSnippet(
  content: string,
  matchedLines: number[],
  fileSize: number
): { text: string; ranges: Array<{ start: number; end: number }>; truncated: boolean } {
  // Small files: return whole content
  if (fileSize <= SMALL_FILE_THRESHOLD || matchedLines.length === 0) {
    return {
      text: content,
      ranges: [{ start: 1, end: content.split("\n").length }],
      truncated: false,
    };
  }

  const lines = content.split("\n");
  const totalLines = lines.length;

  // Compute union of ranges
  const ranges: Array<{ start: number; end: number }> = [];
  const sortedLines = [...new Set(matchedLines)].sort((a, b) => a - b);

  for (const line of sortedLines) {
    const start = Math.max(1, line - SNIPPET_RADIUS);
    const end = Math.min(totalLines, line + SNIPPET_RADIUS);

    // Merge with previous range if overlapping
    const prev = ranges[ranges.length - 1];
    if (prev && start <= prev.end + 1) {
      prev.end = Math.max(prev.end, end);
    } else {
      ranges.push({ start, end });
    }
  }

  // Extract lines for each range
  const snippetLines: string[] = [];
  let prevEnd = 0;

  for (const range of ranges) {
    if (prevEnd > 0 && range.start > prevEnd + 1) {
      snippetLines.push(`\n... [lines ${prevEnd + 1}-${range.start - 1} omitted] ...\n`);
    }
    for (let i = range.start - 1; i < range.end && i < lines.length; i++) {
      snippetLines.push(lines[i]);
    }
    prevEnd = range.end;
  }

  if (prevEnd < totalLines) {
    snippetLines.push(`\n... [lines ${prevEnd + 1}-${totalLines} omitted] ...\n`);
  }

  return {
    text: snippetLines.join("\n"),
    ranges,
    truncated: ranges.length > 0 && (ranges[0].start > 1 || ranges[ranges.length - 1].end < totalLines),
  };
}

// ---------------------------------------------------------------------------
// Main ranking function
// ---------------------------------------------------------------------------

export function rankFiles(
  matchedFrames: MatchedFrame[],
  fileContents: FileContent[],
  bugReport: {
    affectedEndpoint?: string;
    logs?: string;
    description?: string;
  }
): RankingResult {
  const warnings: string[] = [];
  const allPaths = new Set(fileContents.map((f) => f.path));
  const contentByPath = new Map(fileContents.map((f) => [f.path, f]));

  // Scoring map: path → { score, reasons, matchedLines }
  interface ScoreEntry {
    score: number;
    reasons: string[];
    matchedLines: number[];
  }
  const scores = new Map<string, ScoreEntry>();

  function addScore(path: string, score: number, reason: string, line?: number) {
    const existing = scores.get(path) || { score: 0, reasons: [], matchedLines: [] };
    existing.score += score;
    existing.reasons.push(reason);
    if (line) existing.matchedLines.push(line);
    scores.set(path, existing);
  }

  // --- Signal 1: Stack frame matches ---
  const projectFrames = matchedFrames.filter(
    (mf) => mf.matchStatus === "matched" && mf.matchedPath
  );

  projectFrames.forEach((mf, idx) => {
    const weight = 1000 - idx * 10; // first frame scores most
    addScore(
      mf.matchedPath!,
      weight,
      `stack frame #${idx + 1}${mf.frame.line ? ` (line ${mf.frame.line})` : ""}`,
      mf.frame.line || undefined
    );
  });

  // --- Signal 2: Imported/required by a frame file (one hop) ---
  const frameFilePaths = new Set(projectFrames.map((mf) => mf.matchedPath!));

  for (const framePath of frameFilePaths) {
    const fc = contentByPath.get(framePath);
    if (!fc) continue;

    const imports = extractImports(fc.content);
    const srcDir = getDir(framePath);

    for (const imp of imports) {
      const resolved = resolveImport(srcDir, imp, allPaths);
      if (resolved && !frameFilePaths.has(resolved)) {
        addScore(resolved, 500, `imported by frame file ${framePath}`);
      }
    }
  }

  // --- Signal 3: Test files that import a frame file or share base name ---
  for (const fc of fileContents) {
    if (fc.kind !== "test") continue;

    const testImports = extractImports(fc.content);
    const testDir = getDir(fc.path);
    const testBase = getBaseName(fc.path);

    for (const imp of testImports) {
      const resolved = resolveImport(testDir, imp, allPaths);
      if (resolved && frameFilePaths.has(resolved)) {
        addScore(fc.path, 400, `test that imports frame file ${resolved}`);
      }
    }

    // Shared base name
    for (const framePath of frameFilePaths) {
      const frameBase = getBaseName(framePath);
      if (frameBase && testBase === frameBase) {
        addScore(fc.path, 350, `test sharing base name with frame file ${framePath}`);
      }
    }
  }

  // --- Signal 4: File containing affectedEndpoint ---
  if (bugReport.affectedEndpoint) {
    const endpoint = bugReport.affectedEndpoint;
    for (const fc of fileContents) {
      if (fc.content.includes(endpoint)) {
        // Find the line number
        const lines = fc.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(endpoint)) {
            addScore(fc.path, 300, `contains affectedEndpoint "${endpoint}"`, i + 1);
            break; // only first occurrence
          }
        }
      }
    }
  }

  // --- Signal 5: Paths mentioned in logs or description ---
  const textToSearch = [bugReport.logs || "", bugReport.description || ""].join("\n");
  if (textToSearch.trim()) {
    for (const fc of fileContents) {
      // Check if the file's path (or just filename) appears in logs/description
      const filename = fc.path.split("/").pop() || "";
      if (textToSearch.includes(fc.path) || textToSearch.includes(filename)) {
        addScore(fc.path, 200, `path mentioned in bug report logs/description`);
      }
    }
  }

  // --- Signal 6: Project context files (always included) ---
  for (const fc of fileContents) {
    if (CONTEXT_FILES.has(fc.path)) {
      addScore(fc.path, 100, "project context file");
    }
  }

  // --- Sort by score descending, then alphabetically for ties ---
  const sortedPaths = [...scores.entries()]
    .sort(([pathA, a], [pathB, b]) => {
      if (b.score !== a.score) return b.score - a.score;
      return pathA.localeCompare(pathB);
    })
    .map(([path]) => path);

  // --- Apply bounds ---
  const selectedPaths = sortedPaths.slice(0, MAX_FILES);
  const result: RankedFile[] = [];
  let totalBytes = 0;

  for (const filePath of selectedPaths) {
    const fc = contentByPath.get(filePath);
    if (!fc) continue;

    const scoreEntry = scores.get(filePath)!;
    const { text, ranges, truncated } = extractSnippet(
      fc.content,
      scoreEntry.matchedLines,
      fc.size
    );

    let snippetText = text;
    let snippetTruncated = truncated;

    // Check if adding this file would exceed the byte limit
    const snippetBytes = Buffer.byteLength(snippetText, "utf8");
    if (totalBytes + snippetBytes > MAX_TOTAL_BYTES) {
      const remainingBytes = MAX_TOTAL_BYTES - totalBytes;
      if (remainingBytes <= 0) {
        warnings.push(`File "${filePath}" omitted: total byte limit reached`);
        continue;
      }
      // Truncate the snippet to fit
      const buf = Buffer.from(snippetText, "utf8");
      snippetText = buf.subarray(0, remainingBytes).toString("utf8");
      snippetTruncated = true;
      warnings.push(`File "${filePath}" truncated to fit byte limit`);
    }

    totalBytes += Buffer.byteLength(snippetText, "utf8");

    result.push({
      path: filePath,
      language: fc.language,
      kind: fc.kind,
      reasons: scoreEntry.reasons,
      ranges,
      content: snippetText,
      truncated: snippetTruncated,
    });
  }

  // Warn about omitted scored files
  if (sortedPaths.length > MAX_FILES) {
    warnings.push(
      `${sortedPaths.length - MAX_FILES} relevant file(s) omitted due to ${MAX_FILES}-file limit`
    );
  }

  return {
    files: result,
    totalBytes,
    limitBytes: MAX_TOTAL_BYTES,
    warnings,
  };
}
