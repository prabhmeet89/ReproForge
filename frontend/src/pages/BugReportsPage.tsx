import { Link, useSearchParams } from "react-router-dom";
import { Plus, AlertCircle } from "lucide-react";
import { useBugReports } from "../hooks/useBugReports";
import { useProjects } from "../hooks/useProjects";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Select } from "../components/ui/Select";
import { StatusBadge } from "../components/ui/StatusBadge";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export function BugReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const projectId = searchParams.get("projectId") || "";
  const status = searchParams.get("status") || "all";
  const sort = (searchParams.get("sort") as "newest" | "oldest") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const { data: projectsData } = useProjects();
  const { data, isLoading, isError, refetch } = useBugReports({
    projectId: projectId || undefined,
    status: status !== "all" ? status : undefined,
    sort,
    page,
    limit: 10,
  });

  const projects = projectsData?.data || [];
  const bugReports = data?.data || [];
  const meta = data?.meta;

  const projectOptions = [
    { value: "", label: "All Projects" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "submitted", label: "Submitted" },
    { value: "investigating", label: "Investigating" },
    { value: "investigated", label: "AI Hypothesis" },
    { value: "test_generated", label: "Test Generated" },
    { value: "reproduced", label: "Reproduced" },
    { value: "unverified", label: "Unverified" },
    { value: "failed", label: "Failed" },
  ];

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set("page", "1"); // Reset to page 1 on filter change
    setSearchParams(next);
  };

  return (
    <div className="space-y-6">
      {/* Header & New Bug Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Bug Reports</h2>
          <p className="text-xs text-gray-400 mt-0.5">Defect submissions, AI reproductions, and execution verdicts</p>
        </div>
        <Link to="/app/bug-reports/new">
          <Button size="sm" variant="primary" className="gap-1.5 shadow-md shadow-emerald-500/10">
            <Plus className="w-3.5 h-3.5" />
            <span>New Bug Report</span>
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-gray-850 flex flex-wrap items-center gap-3">
        <div className="w-48">
          <Select
            options={projectOptions}
            value={projectId}
            onChange={(e) => updateParam("projectId", e.target.value)}
          />
        </div>

        <div className="w-44">
          <Select
            options={statusOptions}
            value={status}
            onChange={(e) => updateParam("status", e.target.value)}
          />
        </div>

        <div className="w-36 ml-auto">
          <Select
            options={[
              { value: "newest", label: "Newest First" },
              { value: "oldest", label: "Oldest First" },
            ]}
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
          />
        </div>
      </Card>

      {/* Reports Table/List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="text-center py-12">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-gray-300">Failed to load bug reports</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </Card>
      ) : bugReports.length === 0 ? (
        <EmptyState
          title="No bug reports found"
          description={
            projectId || status !== "all"
              ? "No bug reports match the selected filters. Try resetting the filter criteria."
              : "No bug reports submitted yet. Create one to begin automated test reproduction."
          }
          actionLabel="Submit Bug Report"
          onAction={() => window.location.assign("/app/bug-reports/new")}
        />
      ) : (
        <div className="space-y-3">
          {bugReports.map((bug) => (
            <Link
              key={bug.id}
              to={`/app/bug-reports/${bug.id}`}
              className="block group"
            >
              <Card className="p-4 border-gray-850 hoverEffect flex items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-200 group-hover:text-emerald-400 transition-colors truncate">
                      {bug.title}
                    </span>
                    {bug.isDemo && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30 shrink-0">
                        DEMO
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                    <span className="text-gray-400">
                      {projects.find((p) => p.id === bug.projectId)?.name || "Unknown project"}
                    </span>
                    <span>•</span>
                    <span>{bug.affectedEndpoint || "No endpoint specified"}</span>
                    <span>•</span>
                    <span>{new Date(bug.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-4">
                  <StatusBadge status={bug.status} />
                  <span className="text-gray-500 group-hover:text-gray-300 transition-colors hidden sm:inline">
                    →
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 px-2 text-xs text-gray-500">
              <span>
                Page {meta.page} of {meta.totalPages} ({meta.total} total reports)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("page", (page - 1).toString());
                    setSearchParams(next);
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("page", (page + 1).toString());
                    setSearchParams(next);
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
