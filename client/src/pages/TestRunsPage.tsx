import { Link } from "react-router-dom";
import { Terminal, AlertCircle } from "lucide-react";
import { useTestRuns } from "../hooks/useTestRuns";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export function TestRunsPage() {
  const { data, isLoading, isError, refetch } = useTestRuns();

  const testRuns = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-white tracking-tight">Test Runs</h2>
        <p className="text-xs text-gray-400 mt-0.5">Execution logs and exit codes from isolated Docker sandbox suites</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="text-center py-12">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-gray-300">Failed to load test runs</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </Card>
      ) : testRuns.length === 0 ? (
        <EmptyState
          icon={<Terminal className="w-6 h-6 text-gray-400" />}
          title="No test runs recorded"
          description="Test executions will automatically log here when Docker sandbox containers execute reproduction scripts."
        />
      ) : (
        <div className="space-y-3">
          {testRuns.map((run) => (
            <Link key={run.id} to={`/app/test-runs/${run.id}`} className="block group">
              <Card className="p-4 border-gray-850 hoverEffect flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-200 group-hover:text-emerald-400 transition-colors">
                      Run #{run.id.slice(0, 8)}
                    </span>
                    {run.isDemo && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                    <span>Bug Ref: #{run.bugReportId.slice(0, 8)}</span>
                    <span>•</span>
                    <span>{run.durationMs ? `${run.durationMs}ms` : "In Progress"}</span>
                    <span>•</span>
                    <span>{new Date(run.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-4">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                      run.status === "passed"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : run.status === "running"
                        ? "bg-blue-500/10 text-blue-300 border-blue-500/30 animate-pulse"
                        : "bg-gray-800 text-gray-400 border-gray-700"
                    }`}
                  >
                    {run.status.toUpperCase()}
                  </span>
                  <span className="text-gray-500 group-hover:text-gray-300 transition-colors hidden sm:inline">
                    →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
