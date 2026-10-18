import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Terminal, AlertCircle } from "lucide-react";
import { useBugReport } from "../hooks/useBugReports";
import { useProject } from "../hooks/useProjects";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Skeleton } from "../components/ui/Skeleton";

export function BugReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: bug, isLoading, isError } = useBugReport(id);
  const { data: project } = useProject(bug?.projectId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

        {/* Action Trigger Buttons (Disabled in Phase 1 with Tooltip) */}
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

      {/* Pipeline Stepper Timeline */}
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

      {/* Stack Trace */}
      {bug.stackTrace && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Stack Trace</h4>
          <CodeBlock code={bug.stackTrace} language="bash" filename="trace.log" />
        </div>
      )}

      {/* Server Logs */}
      {bug.logs && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Execution Logs</h4>
          <CodeBlock code={bug.logs} language="bash" filename="server.log" />
        </div>
      )}
    </div>
  );
}
