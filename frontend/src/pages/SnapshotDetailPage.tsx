import { useState, useMemo, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Search,
  AlertCircle,
  Code2,
  Layers,
  Terminal,
} from "lucide-react";
import {
  useSnapshot,
  useSnapshotFiles,
  useSnapshotFileContent,
  useDeleteSnapshot,
} from "../hooks/useSnapshots";
import { useProject } from "../hooks/useProjects";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Skeleton } from "../components/ui/Skeleton";
import type { SnapshotFile } from "../types/snapshots";

export function SnapshotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { data: snapshot, isLoading: isSnapshotLoading, isError: isSnapshotError } = useSnapshot(id);
  const { data: project } = useProject(snapshot?.projectId);
  const deleteSnapshot = useDeleteSnapshot();

  // URL search params: selected file path & highlight line
  const selectedFilePath = searchParams.get("file") || "";
  const highlightLineStr = searchParams.get("line");
  const highlightLine = highlightLineStr ? parseInt(highlightLineStr, 10) : undefined;

  // File tree filter state
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Fetch all snapshot files
  const { data: filesData, isLoading: isFilesLoading } = useSnapshotFiles(id, {
    kind: kindFilter,
    search: searchQuery,
    page: 1,
    limit: 200,
  });

  const files = filesData?.data || [];

  // Automatically select the first source or test file if none selected
  useEffect(() => {
    if (!selectedFilePath && files.length > 0) {
      const preferred = files.find((f) => f.kind === "source" || f.kind === "test") || files[0];
      setSearchParams((prev) => {
        prev.set("file", preferred.path);
        return prev;
      });
    }
  }, [files, selectedFilePath, setSearchParams]);

  // Fetch content of selected file
  const {
    data: fileContentData,
    isLoading: isContentLoading,
    isError: isContentError,
  } = useSnapshotFileContent(id, selectedFilePath);

  // Group files into a tree-like hierarchy
  const fileTree = useMemo(() => {
    const root: { [key: string]: any } = {};

    for (const f of files) {
      const parts = f.path.split("/");
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // File node
          current[part] = { __file: f };
        } else {
          // Directory node
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }

    return root;
  }, [files]);

  // Aggregate all secrets across files
  const secretFindingsList = useMemo(() => {
    const list: Array<{ path: string; type: string; line: number }> = [];
    for (const f of files) {
      if (f.secretFindings && f.secretFindings.length > 0) {
        for (const finding of f.secretFindings) {
          list.push({
            path: f.path,
            type: finding.type,
            line: finding.line,
          });
        }
      }
    }
    return list;
  }, [files]);

  const toggleFolder = (folderPath: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const handleDelete = async () => {
    if (!snapshot || !id) return;
    try {
      await deleteSnapshot.mutateAsync({ id, projectId: snapshot.projectId });
      navigate(`/app/projects/${snapshot.projectId}`);
    } catch (err) {
      console.error("Failed to delete snapshot:", err);
    }
  };

  if (isSnapshotLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (isSnapshotError || !snapshot) {
    return (
      <Card className="text-center py-12 max-w-xl mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300">Snapshot not found</p>
        <Link to="/app/projects">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </Card>
    );
  }

  const analysis = snapshot.analysis;
  const isSupported = analysis?.supported ?? false;
  const shortHash = snapshot.contentHash ? snapshot.contentHash.slice(0, 8) : "—";

  // Recursive tree renderer
  const renderTree = (node: any, currentPath = "", depth = 0) => {
    const keys = Object.keys(node).sort((a, b) => {
      const aIsFile = "__file" in node[a];
      const bIsFile = "__file" in node[b];
      if (aIsFile === bIsFile) return a.localeCompare(b);
      return aIsFile ? 1 : -1; // folders first
    });

    return keys.map((key) => {
      const isFile = "__file" in node[key];
      const fullPath = currentPath ? `${currentPath}/${key}` : key;
      const isCollapsed = Boolean(collapsedFolders[fullPath]);

      if (isFile) {
        const fileObj = node[key].__file as SnapshotFile;
        const isSelected = selectedFilePath === fileObj.path;
        const hasSecret = fileObj.secretFindings && fileObj.secretFindings.length > 0;

        return (
          <button
            type="button"
            key={fullPath}
            onClick={() => {
              setSearchParams((prev) => {
                prev.set("file", fileObj.path);
                prev.delete("line");
                return prev;
              });
            }}
            className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              isSelected
                ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                : "text-gray-300 hover:bg-gray-800/60 hover:text-white"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-400" : "text-gray-500"}`} />
              <span className="truncate">{key}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {hasSecret && (
                <span aria-label="Possible secrets flagged">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                </span>
              )}
              <span className="text-[10px] text-gray-500 uppercase">
                {fileObj.language || fileObj.kind}
              </span>
            </div>
          </button>
        );
      }

      return (
        <div key={fullPath} className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleFolder(fullPath)}
            className="w-full flex items-center gap-1.5 text-left px-2 py-1 rounded-lg text-xs font-mono text-gray-400 hover:text-white hover:bg-gray-800/40 transition-colors cursor-pointer"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {isCollapsed ? (
              <Folder className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            ) : (
              <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            )}
            <span className="font-semibold">{key}</span>
          </button>

          {!isCollapsed && (
            <div>{renderTree(node[key], fullPath, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={`/app/projects/${snapshot.projectId}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {project?.name || "project"}</span>
        </Link>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsConfirmDeleteOpen(true)}
          className="text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/40 gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete snapshot</span>
        </Button>
      </div>

      {/* Main Snapshot Header Card */}
      <Card className="p-6 border-gray-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                {snapshot.label || `Snapshot ${shortHash}`}
              </h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 uppercase">
                {snapshot.source}
              </span>
              {snapshot.status === "ready" && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
              <span>SHA-256: <strong className="text-gray-300">{shortHash}</strong></span>
              <span>•</span>
              <span>Total files: <strong className="text-gray-300">{snapshot.fileCount}</strong></span>
              <span>•</span>
              <span>Extracted: <strong className="text-gray-300">{(snapshot.totalBytes / 1024).toFixed(0)} KB</strong></span>
              <span>•</span>
              <span>Captured: <strong className="text-gray-300">{new Date(snapshot.createdAt).toLocaleString()}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/app/bug-reports/new?projectId=${snapshot.projectId}&snapshotId=${snapshot.id}`}>
              <Button size="sm" variant="primary" className="text-xs">
                Create bug report with this snapshot →
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Analysis Cards Grid */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Support status */}
          <Card className="p-4 border-gray-850 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>REPRODUCTION SUPPORT</span>
              <Layers className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex items-center gap-2">
              {isSupported ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <span className="text-base font-bold text-white">
                {isSupported ? "Supported" : "Unsupported"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {analysis.supportReasons?.join(" • ") || "Compatible with automated sandbox repro"}
            </p>
          </Card>

          {/* Framework & Module */}
          <Card className="p-4 border-gray-850 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>FRAMEWORK / RUNTIME</span>
              <Code2 className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-base font-bold text-white capitalize">
              {analysis.framework || "Standard Node.js"}
            </div>
            <div className="text-[11px] text-gray-400 font-mono flex items-center gap-2">
              <span>Module: <strong className="text-gray-300 uppercase">{analysis.moduleSystem}</strong></span>
              <span>•</span>
              <span>TypeScript: <strong className="text-gray-300">{analysis.isTypeScript ? "Yes" : "No"}</strong></span>
            </div>
          </Card>

          {/* Test Framework */}
          <Card className="p-4 border-gray-850 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>TEST RUNNER</span>
              <Terminal className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-base font-bold text-white capitalize">
              {analysis.testFramework || "None detected"}
            </div>
            <p className="text-[11px] text-gray-400">
              {analysis.scripts?.test ? `Test script: "${analysis.scripts.test}"` : "No npm test script found"}
            </p>
          </Card>

          {/* Excluded & Hygiene */}
          <Card className="p-4 border-gray-850 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>HYGIENE & EXCLUSIONS</span>
              <ShieldAlert className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-base font-bold text-white">
              {snapshot.excludedCount} Excluded
            </div>
            <p className="text-[11px] text-gray-400">
              Filtered node_modules, .git, binaries, and dot-env files
            </p>
          </Card>
        </div>
      )}

      {/* Amber Secrets Warning Banner */}
      {snapshot.secretFindingCount > 0 && (
        <Card className="p-5 border-amber-500/30 bg-amber-500/10 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-amber-200">
                Possible secrets found in {secretFindingsList.length || snapshot.secretFindingCount} files. Values are never shown and are redacted from AI context.
              </h3>
              <p className="text-xs text-amber-300/80">
                ReproForge automatically scanned the archive on upload. Any API tokens, private keys, or passwords were scrubbed before storage or heuristic context assembly.
              </p>
            </div>
          </div>

          {secretFindingsList.length > 0 && (
            <div className="mt-2 overflow-x-auto border border-amber-500/20 rounded-xl bg-gray-950/70 p-3">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-1.5 font-medium">File Path</th>
                    <th className="pb-1.5 font-medium">Secret Pattern</th>
                    <th className="pb-1.5 font-medium">Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900 text-gray-300">
                  {secretFindingsList.map((s, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-amber-500/5 cursor-pointer"
                      onClick={() => {
                        setSearchParams((prev) => {
                          prev.set("file", s.path);
                          prev.set("line", s.line.toString());
                          return prev;
                        });
                      }}
                    >
                      <td className="py-1 text-emerald-400 underline">{s.path}</td>
                      <td className="py-1 text-amber-300">{s.type}</td>
                      <td className="py-1 text-gray-400">Line {s.line}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* File Explorer & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: File Tree */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white font-display">Files Explorer</h3>
            <span className="text-[11px] font-mono text-gray-500">{files.length} files</span>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-500" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs py-1.5"
            />
          </div>

          {/* Kind filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
            {["all", "source", "test", "config", "doc"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={`px-2 py-0.5 rounded capitalize transition-colors cursor-pointer ${
                  kindFilter === k
                    ? "bg-gray-700 text-white font-semibold"
                    : "bg-gray-900/60 text-gray-400 hover:text-gray-200"
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Files container */}
          <Card className="p-3 border-gray-850 max-h-[600px] overflow-y-auto">
            {isFilesLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-6 rounded" />
                ))}
              </div>
            ) : files.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No matching files</p>
            ) : (
              <div className="space-y-0.5">{renderTree(fileTree)}</div>
            )}
          </Card>
        </div>

        {/* Right column: File Viewer */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-sm font-mono text-white truncate font-semibold" title={selectedFilePath}>
                {selectedFilePath || "No file selected"}
              </span>
            </div>

            {highlightLine && (
              <span className="text-xs font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Line {highlightLine} highlighted
              </span>
            )}
          </div>

          {/* Code Viewer Container */}
          {isContentLoading ? (
            <Skeleton className="h-[500px] rounded-2xl" />
          ) : isContentError || !fileContentData ? (
            <Card className="text-center py-16 border-gray-850">
              <AlertCircle className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-mono">
                Select a file from the explorer to preview its contents.
              </p>
            </Card>
          ) : (
            <CodeBlock
              code={fileContentData.content}
              filename={selectedFilePath}
              language={selectedFilePath.endsWith(".ts") || selectedFilePath.endsWith(".tsx") ? "typescript" : "javascript"}
              highlightLine={highlightLine}
              truncated={fileContentData.truncated}
              maxHeight="600px"
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 border-gray-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-display font-bold text-white">
              Delete Snapshot?
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              This will permanently delete snapshot <strong className="text-gray-200">{shortHash}</strong> and all extracted file artifacts on disk. Any bug reports referencing this snapshot will be detached.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-850">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsConfirmDeleteOpen(false)}
                disabled={deleteSnapshot.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleDelete}
                disabled={deleteSnapshot.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white border-rose-500"
              >
                {deleteSnapshot.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
