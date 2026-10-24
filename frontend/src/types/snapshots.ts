export interface RepoAnalysis {
  framework: string | null;
  testFramework: string | null;
  scripts: Record<string, string>;
  moduleSystem: "esm" | "commonjs" | "unknown";
  isTypeScript: boolean;
  supported: boolean;
  supportReasons: string[];
  dependencyCount: number;
}

export interface Snapshot {
  id: string;
  projectId: string;
  source: "zip" | "sample" | "github";
  label: string | null;
  status: "processing" | "ready" | "failed";
  errorCode: string | null;
  errorMessage: string | null;
  contentHash: string;
  commitSha: string | null;
  fileCount: number;
  totalBytes: number;
  excludedCount: number;
  storageKey: string;
  analysis: RepoAnalysis | null;
  secretFindingCount: number;
  createdAt: string;
  deduplicated?: boolean;
}

export interface SecretFinding {
  type: string;
  line: number;
}

export interface SnapshotFile {
  id: string;
  snapshotId: string;
  path: string;
  size: number;
  sha256: string;
  lineCount: number;
  language: string | null;
  kind: "source" | "test" | "config" | "doc" | "other";
  secretFindings: SecretFinding[] | null;
}

export interface SnapshotFileContent {
  path: string;
  content: string;
  size: number;
  lineCount: number;
  truncated: boolean;
}

export interface MatchedFrame {
  frame: {
    raw: string;
    function: string;
    file: string;
    line: number | null;
    column: number | null;
    kind: "project" | "node_modules" | "node_internal";
  };
  matchStatus: "matched" | "ambiguous" | "not_found" | "external";
  matchedPath: string | null;
  candidates?: string[];
  lineWarning?: string;
}

export interface RankedFile {
  path: string;
  language: string | null;
  kind: string;
  reasons: string[];
  ranges: Array<{ start: number; end: number }>;
  content: string;
  truncated: boolean;
}

export interface ContextPreviewResult {
  snapshot: {
    id: string;
    contentHash: string;
    commitSha: string | null;
  };
  parsedStack: {
    errorType: string;
    message: string;
    frames: Array<{
      raw: string;
      function: string;
      file: string;
      line: number | null;
      column: number | null;
      kind: string;
    }>;
  };
  matchedFrames: MatchedFrame[];
  files: RankedFile[];
  totalBytes: number;
  limitBytes: number;
  warnings: string[];
  method: "heuristic";
}

export function mapSnapshotErrorMessage(codeOrMessage: string): string {
  switch (codeOrMessage) {
    case "INVALID_ARCHIVE":
      return "The uploaded file is not a valid ZIP archive.";
    case "ARCHIVE_TOO_LARGE":
      return "The archive exceeds the maximum allowed size of 25 MB.";
    case "TOO_MANY_FILES":
      return "The archive contains more than 5,000 files, exceeding the limit.";
    case "EXTRACTED_TOO_LARGE":
      return "The uncompressed archive exceeds the 100 MB extraction limit.";
    case "UNSAFE_PATH":
      return "The archive contains unsafe or invalid file paths.";
    case "ZIP_BOMB":
      return "The archive was rejected due to suspicious compression ratio (potential zip bomb).";
    case "EMPTY_SNAPSHOT":
      return "The archive contains no ingestible source or configuration files.";
    case "QUOTA_EXCEEDED":
      return "Snapshot limit reached for this project or account.";
    default:
      return codeOrMessage || "An unexpected error occurred during snapshot processing.";
  }
}
