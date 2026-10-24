/**
 * Context builder — orchestrates parser → matcher → ranker → redaction.
 *
 * Produces the context-preview response for a bug report with an
 * attached snapshot. No AI calls.
 */

import { parseStackTrace, type ParsedStackTrace } from "./stackTraceParser";
import { matchFrames, type MatchedFrame, type SnapshotFileInfo } from "./frameMatcher";
import { rankFiles, type RankingResult, type RankedFile } from "./relevanceRanker";
import { redactSecrets } from "./secrets";
import { snapshotsRepository, type SnapshotFile } from "../modules/snapshots/snapshots.repository";
import { artifactStorage } from "./artifactStorage";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContextPreviewResult {
  snapshot: {
    id: string;
    contentHash: string;
    commitSha: string | null;
  };
  parsedStack: ParsedStackTrace;
  matchedFrames: MatchedFrame[];
  files: RankedFile[];
  totalBytes: number;
  limitBytes: number;
  warnings: string[];
  method: "heuristic";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Builds the context preview for a bug report.
 *
 * @param snapshotId  The attached snapshot's ID
 * @param bugReport   The bug report data (stackTrace, logs, description, etc.)
 */
export async function buildContextPreview(
  snapshotId: string,
  bugReport: {
    stackTrace?: string;
    logs?: string;
    description?: string;
    affectedEndpoint?: string;
  }
): Promise<ContextPreviewResult> {
  // 1. Load snapshot metadata
  const snapshot = await snapshotsRepository.findById(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot ${snapshotId} not found`);
  }

  // 2. Redact secrets from bug report fields before use
  const safeStackTrace = bugReport.stackTrace
    ? redactSecrets(bugReport.stackTrace).text
    : "";
  const safeLogs = bugReport.logs
    ? redactSecrets(bugReport.logs).text
    : "";
  const safeDescription = bugReport.description
    ? redactSecrets(bugReport.description).text
    : "";

  // 3. Parse the stack trace
  const parsedStack = parseStackTrace(safeStackTrace);

  // 4. Load all snapshot files for matching
  const allFiles = await loadAllSnapshotFiles(snapshotId);

  const fileInfos: SnapshotFileInfo[] = allFiles.map((f) => ({
    path: f.path,
    lineCount: f.lineCount,
    size: f.size,
    language: f.language,
    kind: f.kind,
  }));

  // 5. Match frames to snapshot files
  const matchedFrames = matchFrames(parsedStack.frames, fileInfos);

  // 6. Load file contents from disk (only files that might be relevant)
  const relevantPaths = new Set<string>();

  // Add all matched frame files
  for (const mf of matchedFrames) {
    if (mf.matchedPath) relevantPaths.add(mf.matchedPath);
  }

  // Add all files (we need them for import resolution and searching)
  for (const f of allFiles) {
    relevantPaths.add(f.path);
  }

  const fileContents = await loadFileContents(snapshotId, allFiles);

  // 7. Rank files
  const ranking = rankFiles(matchedFrames, fileContents, {
    affectedEndpoint: bugReport.affectedEndpoint,
    logs: safeLogs,
    description: safeDescription,
  });

  return {
    snapshot: {
      id: snapshot.id,
      contentHash: snapshot.contentHash,
      commitSha: snapshot.commitSha,
    },
    parsedStack,
    matchedFrames,
    files: ranking.files,
    totalBytes: ranking.totalBytes,
    limitBytes: ranking.limitBytes,
    warnings: ranking.warnings,
    method: "heuristic",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Loads all snapshot files from the database (paginated to handle large sets).
 */
async function loadAllSnapshotFiles(snapshotId: string): Promise<SnapshotFile[]> {
  const all: SnapshotFile[] = [];
  let page = 1;
  const limit = 500;

  while (true) {
    const { items } = await snapshotsRepository.findFiles(snapshotId, {
      page,
      limit,
    });
    all.push(...items);
    if (items.length < limit) break;
    page++;
  }

  return all;
}

/**
 * Loads file contents from disk for all snapshot files.
 * Applies secret redaction at read time.
 */
async function loadFileContents(
  snapshotId: string,
  files: SnapshotFile[]
): Promise<Array<{
  path: string;
  language: string | null;
  kind: string;
  lineCount: number;
  size: number;
  content: string;
}>> {
  const snapshotDir = artifactStorage.snapshotDir(snapshotId);
  const results: Array<{
    path: string;
    language: string | null;
    kind: string;
    lineCount: number;
    size: number;
    content: string;
  }> = [];

  for (const file of files) {
    try {
      const filePath = path.resolve(snapshotDir, file.path);
      const raw = await fs.readFile(filePath, "utf8");
      const { text: redacted } = redactSecrets(raw);

      results.push({
        path: file.path,
        language: file.language,
        kind: file.kind,
        lineCount: file.lineCount,
        size: file.size,
        content: redacted,
      });
    } catch {
      // File not on disk — skip silently
    }
  }

  return results;
}
