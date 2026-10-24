/**
 * Stack trace parser — pure function, never throws.
 *
 * Parses Node.js / V8 stack traces into structured frames.
 * Supports all common frame formats:
 *   at fn (/abs/path/file.js:10:15)
 *   at /abs/path/file.js:10:15
 *   at async fn (...)
 *   at file:///C:/x/y/file.mjs:3:4
 *   Windows paths C:\x\y\file.js:10:5
 *   at new Foo (...)
 *   at Object.<anonymous> (...)
 *   at Class.method [as alias] (...)
 *
 * Frames inside node_modules or node:internal are kept but marked as
 * "node_modules" / "node_internal" and never used for ranking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StackFrame {
  /** The original raw line, trimmed. */
  raw: string;
  /** Function name (may be empty string if anonymous). */
  function: string;
  /** File path extracted from the frame (normalised to forward slashes). */
  file: string;
  /** 1-based line number, or null if unparseable. */
  line: number | null;
  /** 1-based column number, or null if unparseable. */
  column: number | null;
  /** "project" | "node_modules" | "node_internal" */
  kind: "project" | "node_modules" | "node_internal";
}

export interface ParsedStackTrace {
  /** The error class / type (e.g. "TypeError"). Empty string if not found. */
  errorType: string;
  /** The error message (everything after "ErrorType: "). */
  message: string;
  /** Parsed frames in order of appearance. */
  frames: StackFrame[];
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Regex to match the "at" line of a V8 stack trace.
 *
 * Groups:
 *   1: optional "async " / "new " prefix + function name
 *   2: file location inside parens  — OR —
 *   3: bare file location (no function name)
 *
 * Examples matched:
 *   at Object.<anonymous> (/a/b.js:1:2)
 *   at async doWork (/a/b.js:1:2)
 *   at new Foo (/a/b.js:1:2)
 *   at Class.method [as alias] (/a/b.js:1:2)
 *   at /a/b.js:1:2
 *   at file:///C:/x/y.mjs:3:4
 */
const AT_LINE_RE = /^\s*at\s+(?:(.+?)\s+\((.+?)\)|(.+?))\s*$/;

/**
 * Regex to extract file:line:column from a location string.
 *
 * Handles:
 *   /abs/path/file.js:10:15
 *   C:\Users\x\file.ts:10:5
 *   file:///C:/x/y/file.mjs:3:4
 *   node:internal/modules/cjs/loader:1234:12
 *
 * Groups: 1=filePath, 2=line, 3=column (optional)
 */
const LOCATION_RE =
  /^((?:file:\/\/\/)?(?:[A-Za-z]:[\\/])?[^:]+|node:[^:]+):(\d+)(?::(\d+))?$/;

/**
 * Error line regex — captures ErrorType and message.
 * E.g. "TypeError: Cannot read properties of undefined"
 */
const ERROR_LINE_RE = /^([A-Za-z_$][A-Za-z0-9_$]*(?:Error|Exception)?)\s*:\s*(.*)$/;

function classifyFrame(file: string): StackFrame["kind"] {
  if (file.startsWith("node:") || file.includes("node_internal")) {
    return "node_internal";
  }
  // Normalise to forward slashes for matching
  const normalized = file.replace(/\\/g, "/");
  if (normalized.includes("/node_modules/") || normalized.includes("\\node_modules\\")) {
    return "node_modules";
  }
  return "project";
}

function normalizeFile(raw: string): string {
  let f = raw;
  // Strip file:/// prefix
  if (f.startsWith("file:///")) {
    f = f.slice(8); // "file:///" -> keep the drive letter on Windows
    // file:///C:/path → C:/path  (8 chars removed)
    // file:///home/path → home/path — re-add leading /
    if (!/^[A-Za-z]:/.test(f)) {
      f = "/" + f;
    }
  }
  // Normalise backslashes to forward slashes
  return f.replace(/\\/g, "/");
}

function parseLocation(loc: string): {
  file: string;
  line: number | null;
  column: number | null;
} {
  const m = LOCATION_RE.exec(loc.trim());
  if (!m) {
    return { file: loc.trim(), line: null, column: null };
  }
  return {
    file: normalizeFile(m[1]),
    line: parseInt(m[2], 10),
    column: m[3] ? parseInt(m[3], 10) : null,
  };
}

function parseFunctionName(raw: string): string {
  let fn = raw.trim();
  // Strip "async " prefix
  if (fn.startsWith("async ")) fn = fn.slice(6).trim();
  // Strip "new " prefix
  if (fn.startsWith("new ")) fn = fn.slice(4).trim();
  // Strip " [as alias]" suffix
  const aliasIdx = fn.indexOf(" [as ");
  if (aliasIdx !== -1) fn = fn.slice(0, aliasIdx).trim();
  return fn;
}

/**
 * Parses a stack trace string into structured data.
 * Never throws — returns whatever could be parsed.
 */
export function parseStackTrace(text: string): ParsedStackTrace {
  const result: ParsedStackTrace = {
    errorType: "",
    message: "",
    frames: [],
  };

  if (!text || typeof text !== "string") {
    return result;
  }

  const lines = text.split(/\r?\n/);

  let errorParsed = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Try parsing as error header (only accept the first one)
    if (!errorParsed) {
      const errMatch = ERROR_LINE_RE.exec(trimmed);
      if (errMatch) {
        result.errorType = errMatch[1];
        result.message = errMatch[2];
        errorParsed = true;
        continue;
      }
    }

    // Try parsing as an "at" frame line
    const atMatch = AT_LINE_RE.exec(trimmed);
    if (!atMatch) continue;

    const fnRaw = atMatch[1] || "";
    const locInParens = atMatch[2]; // location inside (...)
    const bareLoc = atMatch[3]; // bare location (no function)

    const locationStr = locInParens || bareLoc || "";
    const { file, line, column } = parseLocation(locationStr);

    const frame: StackFrame = {
      raw: trimmed,
      function: parseFunctionName(fnRaw),
      file: normalizeFile(file),
      line,
      column,
      kind: classifyFrame(file),
    };

    result.frames.push(frame);
  }

  return result;
}
