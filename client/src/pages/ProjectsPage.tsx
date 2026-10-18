import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FolderGit2, ExternalLink, GitBranch, AlertCircle } from "lucide-react";
import { useProjects } from "../hooks/useProjects";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";

export function ProjectsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useProjects(search);

  const projects = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Projects</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage repositories and codebase contexts</p>
        </div>
        <Link to="/app/projects/new">
          <Button size="sm" variant="primary" className="gap-1.5 shadow-md shadow-emerald-500/10">
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </Button>
        </Link>
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-900/60"
        />
      </div>

      {/* Content State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <Card className="text-center py-12">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-gray-300">Failed to load projects</p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </Card>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects configured"
          description="Create your first project repository to begin capturing and reproducing defects."
          actionLabel="Create Project"
          onAction={() => window.location.assign("/app/projects/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="p-5 border-gray-850 flex flex-col justify-between hoverEffect">
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-sm text-white truncate" title={project.name}>
                      {project.name}
                    </span>
                  </div>
                  {project.isDemo && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-500/10 text-violet-300 rounded border border-violet-500/30 shrink-0">
                      DEMO
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                  <span>{project.defaultBranch}</span>
                </div>

                {project.repositoryUrl && (
                  <a
                    href={project.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400/80 hover:text-emerald-300 flex items-center gap-1 truncate transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{project.repositoryUrl}</span>
                  </a>
                )}
              </div>

              <div className="pt-4 border-t border-gray-850 mt-4 flex items-center justify-between text-[11px] text-gray-500">
                <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                <Link
                  to={`/app/bug-reports?projectId=${project.id}`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  View bugs →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
