/**
 * Frame matcher — maps stack trace frames to snapshot files.
 *
 * Frame paths come from another machine. We normalise slashes and
 * match the LONGEST path suffix against the snapshot manifest.
 *
 * Match statuses:
 *   matched   — unique suffix match found
 *   ambiguous — multiple files share the same suffix (listed as candidates)
 *   not_found — no suffix match
 *   external  — frame is node_modules or node_internal (never matched)
 */

import type { StackFrame } from "./stackTraceParser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotFileInfo {
  path: string;
  lineCount: number;
  size: number;
  language: string | null;
  kind: string;
}

export interface MatchedFrame {
  /** Original frame data. */
  frame: StackFrame;
  /** Match status. */
  matchStatus: "matched" | "ambiguous" | "not_found" | "external";
  /** The matched file path (relative to snapshot root), or null. */
  matchedPath: string | null;
  /** If ambiguous, the list of candidate paths. */
  candidates?: string[];
  /** Warning if the frame's line number exceeds the file's lineCount. */
  lineWarning?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generates all possible suffixes of a path, from longest to shortest.
 * e.g. "a/b/c.js" → ["a/b/c.js", "b/c.js", "c.js"]
 */
function pathSuffixes(filePath: string): string[] {
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const suffixes: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    suffixes.push(parts.slice(i).join("/"));
  }
  return suffixes;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Matches stack trace frames against a snapshot's file manifest.
 *
 * @param frames  Parsed stack frames
 * @param files   Snapshot file manifest (path, lineCount, etc.)
 * @returns       Array of MatchedFrame in the same order as input frames
 */
export function matchFrames(
  frames: StackFrame[],
  files: SnapshotFileInfo[]
): MatchedFrame[] {
  // Build a suffix index: suffix → list of manifest paths
  const suffixIndex = new Map<string, string[]>();

  for (const f of files) {
    const normalized = f.path.replace(/\\/g, "/");
    const parts = normalized.split("/").filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const suffix = parts.slice(i).join("/");
      const existing = suffixIndex.get(suffix);
      if (existing) {
        existing.push(f.path);
      } else {
        suffixIndex.set(suffix, [f.path]);
      }
    }
  }

  // Build a quick lineCount lookup
  const lineCountMap = new Map<string, number>();
  for (const f of files) {
    lineCountMap.set(f.path, f.lineCount);
  }

  return frames.map((frame) => {
    // External frames are never matched
    if (frame.kind === "node_modules" || frame.kind === "node_internal") {
      return {
        frame,
        matchStatus: "external" as const,
        matchedPath: null,
      };
    }

    // Try longest suffix first
    const suffixes = pathSuffixes(frame.file);
    let bestMatch: string[] | null = null;

    for (const suffix of suffixes) {
      const candidates = suffixIndex.get(suffix);
      if (candidates && candidates.length > 0) {
        bestMatch = candidates;
        break; // longest match wins
      }
    }

    if (!bestMatch) {
      return {
        frame,
        matchStatus: "not_found" as const,
        matchedPath: null,
      };
    }

    if (bestMatch.length > 1) {
      return {
        frame,
        matchStatus: "ambiguous" as const,
        matchedPath: null,
        candidates: [...bestMatch],
      };
    }

    // Unique match
    const matchedPath = bestMatch[0];
    const result: MatchedFrame = {
      frame,
      matchStatus: "matched",
      matchedPath,
    };

    // Check line range
    if (frame.line !== null) {
      const lc = lineCountMap.get(matchedPath);
      if (lc !== undefined && frame.line > lc) {
        result.lineWarning = `line out of range (frame line ${frame.line}, file has ${lc} lines)`;
      }
    }

    return result;
  });
}
