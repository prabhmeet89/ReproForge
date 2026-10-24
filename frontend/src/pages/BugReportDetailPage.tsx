import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Terminal,
  AlertCircle,
  FolderGit2,
  FileCode,
  Info,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useBugReport } from "../hooks/useBugReports";
import { useProject } from "../hooks/useProjects";
import {
  useSnapshot,
  useSnapshots,
  useContextPreview,
  useAttachSnapshot,
} from "../hooks/useSnapshots";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Skeleton } from "../components/ui/Skeleton";
import { Select } from "../components/ui/Select";

export function BugReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: bug, isLoading, isError } = useBugReport(id);
  const { data: project } = useProject(bug?.projectId);

  // Snapshot and Context Preview queries
  const { data: snapshot } = useSnapshot(bug?.snapshotId);
  const { data: projectSnapshotsData } = useSnapshots(bug?.projectId);
  const {
    data: preview,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
  } = useContextPreview(bug?.snapshotId ? id : undefined);

  const attachSnapshot = useAttachSnapshot();

  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("");

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (isError || !bug) {
    return (
      <Card className="text-center py-12 max-w-xl mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300">Bug report not found</p>
        <Link to="/app/bug-reports">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Bug Reports
          </Button>
        </Link>
      </Card>
    );
  }

  // Pipeline lifecycle steps
  const TIMELINE_STEPS = [
    { label: "Submitted", active: true, done: true, desc: "Received in repro queue" },
    { label: "Investigated", active: bug.status === "investigated" || bug.status === "reproduced", done: bug.status !== "submitted", desc: "AST & LLM code path analysis" },
    { label: "Test Generated", active: bug.status === "test_generated" || bug.status === "reproduced", done: bug.status === "reproduced", desc: "Minimal test case written" },
    { label: "Executed", active: bug.status === "reproduced" || bug.status === "failed", done: bug.status === "reproduced", desc: "Isolated Docker sandbox container run" },
    { label: "Verified", active: bug.status === "reproduced", done: bug.status === "reproduced", desc: "Deterministic reproduction proof confirmed" },
  ];

  const rawSnapshots = Array.isArray(projectSnapshotsData?.data)
    ? projectSnapshotsData.data
    : Array.isArray(projectSnapshotsData)
    ? projectSnapshotsData
    : [];
  const readySnapshots = rawSnapshots.filter((s: any) => s.status === "ready");


  const handleAttachSnapshot = async () => {
    if (!id || !selectedSnapshotId) return;
    try {
      await attachSnapshot.mutateAsync({
        bugReportId: id,
        snapshotId: selectedSnapshotId,
      });
      setIsAttachModalOpen(false);
    } catch (err) {
      console.error("Failed to attach snapshot:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/bug-reports"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to bug reports</span>
        </Link>

        {bug.isDemo && (
          <span className="text-xs font-mono px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30">
            DEMO RECORD
          </span>
        )}
      </div>

      {/* Main Header Card */}
      <Card className="p-6 border-gray-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight leading-snug">
              {bug.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
              <span className="text-emerald-400 font-semibold">{project?.name || "Project"}</span>
              <span>•</span>
              <span>{bug.affectedEndpoint || "No endpoint specified"}</span>
              <span>•</span>
              <span>{new Date(bug.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <StatusBadge status={bug.status} className="shrink-0 self-start" />
        </div>

        {/* Action Trigger Buttons */}
        <div className="pt-4 border-t border-gray-850 flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Button size="sm" variant="secondary" disabled className="gap-2 opacity-50 cursor-not-allowed">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start AI Investigation</span>
            </Button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 border border-gray-700 text-gray-300 text-[11px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-20">
              Available in Phase 6 (AI Integration)
            </div>
          </div>

          <div className="relative group">
            <Button size="sm" variant="secondary" disabled className="gap-2 opacity-50 cursor-not-allowed">
              <Terminal className="w-3.5 h-3.5" />
              <span>Generate Test Suite</span>
            </Button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 border border-gray-700 text-gray-300 text-[11px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap z-20">
              Available in Phase 8 (Docker Sandbox Execution)
            </div>
          </div>

          <Link to={`/app/bug-reports/${bug.id}/investigation`} className="ml-auto">
            <Button size="sm" variant="outline" className="text-xs">
              View Investigation Hypothesis →
            </Button>
          </Link>
        </div>
      </Card>

      {/* Codebase Snapshot Attachment Card */}
      <Card className="p-4 border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FolderGit2 className="w-4 h-4" />
          </div>

          {snapshot ? (
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">ATTACHED SNAPSHOT:</span>
                <span className="text-xs font-semibold text-white truncate font-mono">
                  {snapshot.label || snapshot.contentHash.slice(0, 8)}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-800 text-gray-300 rounded border border-gray-700 uppercase">
                  {snapshot.source}
                </span>
                {snapshot.secretFindingCount > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/10 text-amber-300 rounded border border-amber-500/30 flex items-center gap-1">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    {snapshot.secretFindingCount} secrets
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                {snapshot.fileCount} files • {(snapshot.totalBytes / 1024).toFixed(0)} KB • Captured {new Date(snapshot.createdAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-gray-300">
                No codebase snapshot attached
              </span>
              <p className="text-[11px] text-gray-500">
                Attach a snapshot from this project to unlock heuristic relevant files and sandbox reproduction.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {snapshot && (
            <Link to={`/app/snapshots/${snapshot.id}`}>
              <Button size="sm" variant="ghost" className="text-xs text-gray-400 hover:text-white">
                Inspect snapshot
              </Button>
            </Link>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedSnapshotId(bug.snapshotId || (readySnapshots[0]?.id ?? ""));
              setIsAttachModalOpen(true);
            }}
            className="text-xs"
          >
            {snapshot ? "Change snapshot" : "Attach snapshot"}
          </Button>
        </div>
      </Card>

      {/* Relevant Files Panel (Context Preview) */}
      {bug.snapshotId && (
        <Card className="p-6 border-gray-850 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-gray-850">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-display font-bold text-white tracking-tight">
                  Relevant Files
                </h3>
                {/* Visible Heuristic Badge */}
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30 font-medium">
                  Heuristic selection. No AI was used.
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Deterministically ranked candidate files based on stack trace frame matching, import graphs, and affected endpoints.
              </p>
            </div>

            {/* Context Size Meter */}
            {preview && (
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 shrink-0 sm:w-56 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>Context Size</span>
                  <strong className="text-gray-200">
                    {(preview.totalBytes / 1024).toFixed(1)} KB of {(preview.limitBytes / 1024).toFixed(0)} KB
                  </strong>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (preview.totalBytes / preview.limitBytes) * 100)}%`,
                    }}
                  />
                </div>
                {preview.files.some((f) => f.truncated) && (
                  <p className="text-[10px] text-amber-400/90 font-mono">
                    Large files trimmed to matched line radius
                  </p>
                )}
              </div>
            )}
          </div>

          {isPreviewLoading ? (
            <div className="space-y-4 py-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : isPreviewError || !preview ? (
            <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800 text-xs text-gray-400 flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Could not generate context preview for this bug report.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parsed Frames with Match Badges */}
              {preview.matchedFrames.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono tracking-wider">
                    Stack Trace Frames ({preview.matchedFrames.length})
                  </h4>
                  <div className="space-y-1.5">
                    {preview.matchedFrames.map((mf, idx) => {
                      const isMatched = mf.matchStatus === "matched";
                      const isAmbiguous = mf.matchStatus === "ambiguous";
                      const isNotFound = mf.matchStatus === "not_found";
                      const isExternal = mf.matchStatus === "external";

                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl border border-gray-800/80 bg-gray-900/40 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-gray-500 shrink-0">#{idx + 1}</span>
                              <span className="text-white font-semibold truncate">
                                {mf.frame.function || "anonymous"}
                              </span>
                              <span className="text-gray-400 truncate text-[11px]">
                                {mf.frame.file}
                                {mf.frame.line ? `:${mf.frame.line}` : ""}
                              </span>
                            </div>
                            {mf.lineWarning && (
                              <p className="text-[10px] text-amber-400 pl-4">
                                ⚠ {mf.lineWarning}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {isMatched && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                                Matched: {mf.matchedPath}
                              </span>
                            )}
                            {isAmbiguous && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium" title={mf.candidates?.join(", ")}>
                                Ambiguous ({mf.candidates?.length} files)
                              </span>
                            )}
                            {isNotFound && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                                Not found in snapshot
                              </span>
                            )}
                            {isExternal && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-gray-850 text-gray-500 border border-gray-800">
                                External frame
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ranked Files List */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono tracking-wider">
                  Ranked Relevant Files ({preview.files.length})
                </h4>

                <div className="space-y-4">
                  {preview.files.map((file, idx) => {
                    const firstRange = file.ranges[0];
                    const targetLine = firstRange?.start;

                    return (
                      <Card key={idx} className="p-4 border-gray-850 space-y-3 bg-gray-900/40">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2 border-b border-gray-850">
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 truncate">
                              <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                              <Link
                                to={`/app/snapshots/${preview.snapshot.id}?file=${encodeURIComponent(file.path)}${targetLine ? `&line=${targetLine}` : ""}`}
                                className="text-sm font-mono font-semibold text-white hover:text-emerald-300 transition-colors truncate"
                                title="Open in Snapshot Viewer"
                              >
                                {file.path}
                              </Link>
                              {file.language && (
                                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-gray-800 text-gray-400 rounded">
                                  {file.language}
                                </span>
                              )}
                            </div>

                            {/* Reason Chips */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {file.reasons.map((reason, rIdx) => (
                                <span
                                  key={rIdx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-800 text-gray-300 border border-gray-700"
                                >
                                  {reason}
                                </span>
                              ))}

                              {file.ranges.map((range, rgIdx) => (
                                <span
                                  key={rgIdx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                >
                                  Lines {range.start}–{range.end}
                                </span>
                              ))}
                            </div>
                          </div>

                          <Link
                            to={`/app/snapshots/${preview.snapshot.id}?file=${encodeURIComponent(file.path)}${targetLine ? `&line=${targetLine}` : ""}`}
                            className="shrink-0"
                          >
                            <Button size="sm" variant="ghost" className="text-xs text-gray-400 hover:text-white gap-1">
                              <span>Open file</span>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </Link>
                        </div>

                        {/* Code snippet */}
                        <CodeBlock
                          code={file.content}
                          filename={file.path}
                          language={file.language || "typescript"}
                          highlightLine={targetLine}
                          truncated={file.truncated}
                          maxHeight="250px"
                        />
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Reproduction Pipeline Stepper Timeline */}
      <Card className="p-6 border-gray-850">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 font-mono">
          Reproduction Pipeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TIMELINE_STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                step.done
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                  : step.active
                  ? "bg-gray-850 border-gray-700 text-gray-200"
                  : "bg-gray-900/30 border-gray-850 text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{step.label}</span>
                <span className="text-[10px] font-mono">0{idx + 1}</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-snug">{step.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Description & Behaviors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 border-gray-850 space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Issue Description</h4>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{bug.description}</p>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 border-gray-850 space-y-1.5">
            <h4 className="text-xs font-semibold text-emerald-400 font-mono">Expected Behavior</h4>
            <p className="text-xs text-gray-300 leading-relaxed">{bug.expectedBehavior}</p>
          </Card>

          <Card className="p-4 border-gray-850 space-y-1.5">
            <h4 className="text-xs font-semibold text-rose-400 font-mono">Actual Behavior</h4>
            <p className="text-xs text-gray-300 leading-relaxed">{bug.actualBehavior}</p>
          </Card>
        </div>
      </div>

      {/* Raw Stack Trace */}
      {bug.stackTrace && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Original Stack Trace</h4>
          <CodeBlock code={bug.stackTrace} language="bash" filename="trace.log" />
        </div>
      )}

      {/* Execution Logs */}
      {bug.logs && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Execution Logs</h4>
          <CodeBlock code={bug.logs} language="bash" filename="server.log" />
        </div>
      )}

      {/* Change / Attach Snapshot Modal */}
      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 border-gray-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-850">
              <h3 className="text-base font-display font-bold text-white">
                {snapshot ? "Change Codebase Snapshot" : "Attach Codebase Snapshot"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Select a processed snapshot from project <strong className="text-gray-200">{project?.name}</strong> to link with this bug report.
            </p>

            <div className="space-y-2">
              <Select
                id="modalSnapshotId"
                label="Available Snapshots"
                options={[
                  { value: "", label: "Select a snapshot..." },
                  ...readySnapshots.map((s) => ({
                    value: s.id,
                    label: `${s.label || "Snapshot " + s.contentHash.slice(0, 8)} (${s.fileCount} files)`,
                  })),
                ]}
                value={selectedSnapshotId}
                onChange={(e) => setSelectedSnapshotId(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-850">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAttachModalOpen(false)}
                disabled={attachSnapshot.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAttachSnapshot}
                disabled={!selectedSnapshotId || attachSnapshot.isPending}
                className="gap-1.5"
              >
                {attachSnapshot.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Attaching...</span>
                  </>
                ) : (
                  <span>Attach Snapshot</span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
