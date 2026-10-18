import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Terminal, AlertCircle } from "lucide-react";
import { useTestRun } from "../hooks/useTestRuns";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CodeBlock } from "../components/ui/CodeBlock";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export function TestRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading, isError } = useTestRun(id);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (isError || !run) {
    return (
      <Card className="text-center py-12 max-w-xl mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300">Test run not found</p>
        <Link to="/app/test-runs">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Test Runs
          </Button>
        </Link>
      </Card>
    );
  }

  const PIPELINE_STEPS = [
    { label: "Queued", done: true, desc: "Worker picked up job" },
    { label: "Spinning Container", done: true, desc: "Isolated Docker image loaded" },
    { label: "Executing Suite", done: run.status !== "running", desc: "Running test scripts" },
    {
      label: run.status === "passed" ? "Reproduced" : run.status === "failed" ? "Failed" : "Running",
      done: run.status === "passed",
      desc: "Capturing deterministic output",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/app/test-runs"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to test runs</span>
        </Link>

        {run.isDemo && (
          <span className="text-xs font-mono px-2 py-0.5 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30">
            DEMO RECORD
          </span>
        )}
      </div>

      {/* Header Summary */}
      <Card className="p-6 border-gray-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              Test Run #{run.id.slice(0, 8)}
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Associated Bug Report:{" "}
              <Link to={`/app/bug-reports/${run.bugReportId}`} className="text-emerald-400 hover:underline">
                #{run.bugReportId.slice(0, 8)}
              </Link>
            </p>
          </div>

          <span
            className={`text-xs px-3 py-1 rounded-full font-mono border self-start ${
              run.status === "passed"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : run.status === "running"
                ? "bg-blue-500/10 text-blue-300 border-blue-500/30 animate-pulse"
                : "bg-gray-800 text-gray-400 border-gray-700"
            }`}
          >
            {run.status.toUpperCase()}
          </span>
        </div>

        {/* Execution Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-850">
          <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-850">
            <span className="text-[11px] font-mono text-gray-500 block">EXIT CODE</span>
            <span className="font-mono text-sm font-semibold text-white">
              {run.exitCode !== undefined ? run.exitCode : "--"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-850">
            <span className="text-[11px] font-mono text-gray-500 block">DURATION</span>
            <span className="font-mono text-sm font-semibold text-white">
              {run.durationMs ? `${run.durationMs}ms` : "--"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-850">
            <span className="text-[11px] font-mono text-gray-500 block">ENVIRONMENT</span>
            <span className="font-mono text-sm font-semibold text-white">Node 20 Sandbox</span>
          </div>

          <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-850">
            <span className="text-[11px] font-mono text-gray-500 block">TIMESTAMP</span>
            <span className="font-mono text-xs text-gray-300">
              {new Date(run.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Stepper Pipeline */}
      <Card className="p-6 border-gray-850">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 font-mono">
          Container Execution Lifecycle
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs space-y-1 ${
                step.done
                  ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-300"
                  : "bg-gray-850 border-gray-700 text-gray-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{step.label}</span>
                <span className="text-[10px] font-mono">0{idx + 1}</span>
              </div>
              <p className="text-[11px] text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Stdout Output Panel */}
      {run.stdout ? (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase font-mono">Standard Output (stdout)</h4>
          <CodeBlock code={run.stdout} language="bash" filename="container-stdout.log" />
        </div>
      ) : (
        <EmptyState
          icon={<Terminal className="w-5 h-5 text-gray-400" />}
          title="No container stdout recorded"
          description="Output will appear once the execution process completes inside the sandbox."
        />
      )}

      {/* Stderr Output Panel */}
      {run.stderr && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-rose-400 uppercase font-mono">Standard Error (stderr)</h4>
          <CodeBlock code={run.stderr} language="bash" filename="container-stderr.log" />
        </div>
      )}
    </div>
  );
}
