import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { bugReportFormSchema } from "../lib/schemas";
import type { BugReportFormData } from "../lib/schemas";
import { useCreateBugReport } from "../hooks/useBugReports";
import { useProjects } from "../hooks/useProjects";
import { useSnapshots } from "../hooks/useSnapshots";
import { ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { Select } from "../components/ui/Select";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";

export function CreateBugReportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "";
  const initialSnapshotId = searchParams.get("snapshotId") || "";

  const createBugReport = useCreateBugReport();
  const { data: projectsData, isLoading: isLoadingProjects } = useProjects();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const projects = Array.isArray(projectsData?.data) ? projectsData.data : [];

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportFormSchema),
    defaultValues: {
      projectId: initialProjectId,
      snapshotId: initialSnapshotId,
      title: "",
      description: "",
      expectedBehavior: "",
      actualBehavior: "",
      affectedEndpoint: "",
      stackTrace: "",
      logs: "",
    },
  });

  const selectedProjectId = watch("projectId");
  const { data: snapshotsData } = useSnapshots(selectedProjectId);

  const rawSnapshots = Array.isArray(snapshotsData?.data)
    ? snapshotsData.data
    : Array.isArray(snapshotsData)
    ? snapshotsData
    : [];
  const readySnapshots = rawSnapshots.filter((s: any) => s.status === "ready");
  const snapshotOptions = [
    { value: "", label: "No snapshot attached (optional)" },
    ...readySnapshots.map((s) => ({
      value: s.id,
      label: `${s.label || "Snapshot " + (s.contentHash ? s.contentHash.slice(0, 8) : s.id.slice(0, 8))} (${s.fileCount} files)`,
    })),
  ];



  const descriptionVal = watch("description") || "";
  const expectedVal = watch("expectedBehavior") || "";
  const actualVal = watch("actualBehavior") || "";
  const stackTraceVal = watch("stackTrace") || "";
  const logsVal = watch("logs") || "";

  const onSubmit = async (data: BugReportFormData) => {
    try {
      const payload: BugReportFormData = {
        ...data,
        snapshotId: data.snapshotId && data.snapshotId.trim() ? data.snapshotId.trim() : undefined,
      };
      const created = await createBugReport.mutateAsync(payload);
      setToastMessage("Bug report submitted successfully!");
      setTimeout(() => {
        navigate(`/app/bug-reports/${created.id}`);
      }, 1000);

    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        err.errors.forEach((fieldError) => {
          setError(fieldError.field as keyof BugReportFormData, {
            type: "server",
            message: fieldError.message,
          });
        });
      } else {
        setError("root", {
          message: err instanceof Error ? err.message : "Failed to submit bug report",
        });
      }
    }
  };

  const projectOptions = [
    { value: "", label: isLoadingProjects ? "Loading projects..." : "Select a project *" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/app/bug-reports"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Submit Bug Report</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Provide issue context and execution paths for AI reproduction synthesis
          </p>
        </div>
      </div>

      <Card className="p-6 border-gray-850">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errors.root.message}
            </div>
          )}

          {/* Project Selector */}
          <Select
            id="projectId"
            label="Target Project *"
            options={projectOptions}
            error={errors.projectId?.message}
            {...register("projectId")}
          />

          {/* Snapshot Selector (Optional) */}
          <Select
            id="snapshotId"
            label="Attached Codebase Snapshot (Optional)"
            options={snapshotOptions}
            error={errors.snapshotId?.message}
            disabled={!selectedProjectId}
            helperText={
              !selectedProjectId
                ? "Select a project first to see its snapshots"
                : readySnapshots.length === 0
                ? "No ready snapshots found for this project"
                : undefined
            }
            {...register("snapshotId")}
          />


          {/* Bug Title */}
          <Input
            id="title"
            label="Bug Title *"
            placeholder="e.g. POST /auth/login returns 500 when email has trailing whitespace"
            error={errors.title?.message}
            {...register("title")}
          />

          {/* Affected Endpoint (Optional) */}
          <Input
            id="affectedEndpoint"
            label="Affected Endpoint / Function (Optional)"
            placeholder="e.g. POST /api/v1/users/create or src/services/auth.ts:42"
            error={errors.affectedEndpoint?.message}
            {...register("affectedEndpoint")}
          />

          {/* Detailed Description */}
          <Textarea
            id="description"
            label="Detailed Description *"
            placeholder="Explain what steps trigger the issue, symptoms, and environment details..."
            rows={4}
            characterCount={{ current: descriptionVal.length, max: 5000 }}
            error={errors.description?.message}
            {...register("description")}
          />

          {/* Side by side Expected vs Actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Textarea
              id="expectedBehavior"
              label="Expected Behavior *"
              placeholder="What should have happened according to specs..."
              rows={3}
              characterCount={{ current: expectedVal.length, max: 2000 }}
              error={errors.expectedBehavior?.message}
              {...register("expectedBehavior")}
            />
            <Textarea
              id="actualBehavior"
              label="Actual Behavior *"
              placeholder="What actually occurred instead..."
              rows={3}
              characterCount={{ current: actualVal.length, max: 2000 }}
              error={errors.actualBehavior?.message}
              {...register("actualBehavior")}
            />
          </div>

          {/* Stack Trace (Monospace) */}
          <Textarea
            id="stackTrace"
            label="Stack Trace (Optional)"
            placeholder="TypeError: Cannot read properties of undefined..."
            rows={4}
            className="font-mono text-xs"
            characterCount={{ current: stackTraceVal.length, max: 50000 }}
            error={errors.stackTrace?.message}
            {...register("stackTrace")}
          />

          {/* Logs (Monospace) */}
          <Textarea
            id="logs"
            label="Relevant Server / Application Logs (Optional)"
            placeholder="[INFO] Request started at 12:00:00.000Z..."
            rows={4}
            className="font-mono text-xs"
            characterCount={{ current: logsVal.length, max: 50000 }}
            error={errors.logs?.message}
            {...register("logs")}
          />

          {/* Actions */}
          <div className="pt-4 border-t border-gray-850 flex items-center justify-end gap-3">
            <Link to="/app/bug-reports">
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting || createBugReport.isPending}
            >
              Submit & Enqueue for Repro
            </Button>
          </div>
        </form>
      </Card>

      {toastMessage && (
        <Toast
          type="success"
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
