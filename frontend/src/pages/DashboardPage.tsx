import { Link } from "react-router-dom";
import { FolderGit2, Bug, CheckCircle2, AlertCircle, ArrowRight, Clock, Terminal } from "lucide-react";
import { useDashboardSummary } from "../hooks/useDashboard";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="text-center py-12">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">Failed to connect to ReproForge API</h3>
        <p className="text-sm text-gray-400 max-w-sm mx-auto mt-1 mb-6">
          Make sure the backend server is running on http://localhost:3001.
        </p>
        <Button variant="secondary" size="sm" onClick={() => refetch()}>
          Retry Connection
        </Button>
      </Card>
    );
  }

  const { counts, recentBugReports, recentTestRuns } = data;

  const STAT_CARDS = [
    {
      label: "Total Projects",
      value: counts.projects,
      icon: FolderGit2,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Bug Reports",
      value: counts.bugReports,
      icon: Bug,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    {
      label: "Reproduced Proofs",
      value: counts.reproduced,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Pending / Unverified",
      value: counts.unverified + counts.submitted,
      icon: Clock,
      color: "text-gray-400",
      bg: "bg-gray-800",
      border: "border-gray-700",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((stat, idx) => (
          <Card key={idx} className="p-5 flex items-center justify-between border-gray-850">
            <div>
              <p className="text-xs font-medium text-gray-400">{stat.label}</p>
              <p className="text-3xl font-display font-bold text-white mt-1">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.border} border flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </Card>
        ))}
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bug Reports */}
        <Card className="border-gray-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-850 mb-4">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-emerald-400" />
                <h2 className="font-display font-semibold text-base text-white">Recent Bug Reports</h2>
              </div>
              <Link to="/app/bug-reports" className="text-xs text-gray-400 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentBugReports.length === 0 ? (
              <EmptyState
                title="No bug reports yet"
                description="Submit your first bug report with repository context to generate test reproductions."
                actionLabel="Create Bug Report"
                onAction={() => {}}
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-gray-850/60">
                {recentBugReports.map((bug) => (
                  <Link
                    key={bug.id}
                    to={`/app/bug-reports/${bug.id}`}
                    className="py-3 px-2 flex items-center justify-between hover:bg-gray-850/40 rounded-xl transition-colors group block"
                  >
                    <div className="space-y-1 pr-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-200 group-hover:text-emerald-400 transition-colors truncate">
                          {bug.title}
                        </p>
                        {bug.isDemo && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{bug.affectedEndpoint || "General defect"}</p>
                    </div>
                    <StatusBadge status={bug.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Test Runs */}
        <Card className="border-gray-850 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-850 mb-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                <h2 className="font-display font-semibold text-base text-white">Recent Test Runs</h2>
              </div>
              <Link to="/app/test-runs" className="text-xs text-gray-400 hover:text-blue-400 flex items-center gap-1 transition-colors">
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentTestRuns.length === 0 ? (
              <EmptyState
                title="No test runs yet"
                description="Test runs will appear here once AI generates and executes reproduction suites in Docker."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-gray-850/60">
                {recentTestRuns.map((run) => (
                  <Link
                    key={run.id}
                    to={`/app/test-runs/${run.id}`}
                    className="py-3 px-2 flex items-center justify-between hover:bg-gray-850/40 rounded-xl transition-colors group block"
                  >
                    <div className="space-y-1 pr-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-300">Run #{run.id.slice(0, 8)}</span>
                        {run.isDemo && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30">
                            DEMO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {run.durationMs ? `${run.durationMs}ms duration` : "Execution queued"}
                      </p>
                    </div>
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
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
