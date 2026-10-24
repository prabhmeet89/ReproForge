import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  FolderGit2,
  GitBranch,
  ExternalLink,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode,
  ShieldAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useProject } from "../hooks/useProjects";
import {
  useSnapshots,
  useUploadSnapshot,
  useIngestSampleSnapshot,
} from "../hooks/useSnapshots";
import { mapSnapshotErrorMessage } from "../types/snapshots";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Skeleton } from "../components/ui/Skeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { Toast } from "../components/ui/Toast";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading: isProjectLoading, isError: isProjectError } = useProject(id);
  const {
    data: snapshotsData,
    isLoading: isSnapshotsLoading,
    isError: isSnapshotsError,
    refetch: refetchSnapshots,
  } = useSnapshots(id);

  const uploadSnapshot = useUploadSnapshot();
  const ingestSample = useIngestSampleSnapshot();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadClientError, setUploadClientError] = useState<string | null>(null);
  const [uploadServerError, setUploadServerError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (isProjectLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (isProjectError || !project) {
    return (
      <Card className="text-center py-12 max-w-xl mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <p className="text-sm text-gray-300">Project not found</p>
        <Link to="/app/projects">
          <Button variant="secondary" size="sm" className="mt-4">
            Back to Projects
          </Button>
        </Link>
      </Card>
    );
  }

  const snapshots = snapshotsData?.data || [];

  const validateAndSetFile = (file: File) => {
    setUploadClientError(null);
    setUploadServerError(null);

    const isZip = file.name.toLowerCase().endsWith(".zip") || file.type === "application/zip";
    if (!isZip) {
      setUploadClientError("Only .zip archives are supported. Please select a valid ZIP file.");
      setUploadFile(null);
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploadClientError(`File size (${sizeMb} MB) exceeds the maximum allowed limit of 25 MB.`);
      setUploadFile(null);
      return false;
    }

    setUploadFile(file);
    return true;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !id) return;

    setUploadServerError(null);
    try {
      const res = await uploadSnapshot.mutateAsync({
        projectId: id,
        file: uploadFile,
        label: uploadLabel.trim() || undefined,
      });

      if (res.deduplicated) {
        setToastMessage("Snapshot already exists with identical contents (deduplicated).");
      } else {
        setToastMessage("Snapshot uploaded and processed successfully!");
      }

      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadLabel("");
    } catch (err: any) {
      const msg = mapSnapshotErrorMessage(err?.message || "Failed to upload snapshot");
      setUploadServerError(msg);
    }
  };

  const handleAddSample = async () => {
    if (!id) return;
    try {
      const res = await ingestSample.mutateAsync({
        projectId: id,
        sampleName: "payment-order-bug",
        label: "Sample: payment-order-bug",
      });

      if (res.deduplicated) {
        setToastMessage("Sample repository already ingested for this project (deduplicated).");
      } else {
        setToastMessage("Sample repository ingested successfully!");
      }
    } catch (err: any) {
      const msg = mapSnapshotErrorMessage(err?.message || "Failed to ingest sample repository");
      setToastMessage(`Error: ${msg}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          type="success"
        />
      )}

      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/projects"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to projects</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to={`/app/bug-reports?projectId=${project.id}`}>
            <Button size="sm" variant="secondary" className="text-xs">
              View bug reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Project Header Info Card */}
      <Card className="p-6 border-gray-850 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <FolderGit2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                  {project.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono mt-0.5">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                    {project.defaultBranch}
                  </span>
                  <span>•</span>
                  <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400/80 hover:text-emerald-300 inline-flex items-center gap-1.5 font-mono pt-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{project.repositoryUrl}</span>
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddSample}
              disabled={ingestSample.isPending}
              className="gap-1.5"
            >
              {ingestSample.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>Add sample repo</span>
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setUploadClientError(null);
                setUploadServerError(null);
                setUploadFile(null);
                setIsUploadModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload ZIP</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Snapshots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-bold text-white tracking-tight">
              Repository Snapshots
            </h2>
            <p className="text-xs text-gray-400">
              Immutable point-in-time codebase archives used for evidence gathering and repros.
            </p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetchSnapshots()}
            className="text-gray-400 hover:text-white gap-1 text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </Button>
        </div>

        {isSnapshotsLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : isSnapshotsError ? (
          <Card className="text-center py-10">
            <AlertCircle className="w-6 h-6 text-rose-400 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Failed to load snapshots</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetchSnapshots()}
              className="mt-3 text-xs"
            >
              Retry
            </Button>
          </Card>
        ) : snapshots.length === 0 ? (
          <EmptyState
            title="No codebase snapshots yet"
            description="Upload a ZIP archive of your project repository or click 'Add sample repo' to test reproduction."
            actionLabel="Upload ZIP Snapshot"
            onAction={() => setIsUploadModalOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {snapshots.map((snap) => {
              const isReady = snap.status === "ready";
              const isFailed = snap.status === "failed";
              const isProcessing = snap.status === "processing";
              const isSupported = snap.analysis?.supported ?? false;
              const hasSecrets = snap.secretFindingCount > 0;
              const shortHash = snap.contentHash ? snap.contentHash.slice(0, 8) : "—";

              return (
                <Card
                  key={snap.id}
                  className="p-4 border-gray-850 hover:border-gray-700/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">
                        {snap.label || `Snapshot ${shortHash}`}
                      </span>

                      {/* Source badge */}
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                        {snap.source}
                      </span>

                      {/* Status badge */}
                      {isReady && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready
                        </span>
                      )}
                      {isProcessing && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processing
                        </span>
                      )}
                      {isFailed && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}

                      {/* Supported / Unsupported badge */}
                      {isReady && snap.analysis && (
                        isSupported ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30" title={snap.analysis.framework || "Supported"}>
                            {snap.analysis.framework || "Supported"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30" title={snap.analysis.supportReasons?.join(", ") || "Unsupported framework"}>
                            Unsupported
                          </span>
                        )
                      )}

                      {/* Secrets badge */}
                      {hasSecrets && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold">
                          <ShieldAlert className="w-3 h-3 text-amber-400" />
                          {snap.secretFindingCount} secrets flagged
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                      <span>Hash: {shortHash}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <FileCode className="w-3 h-3 text-gray-500" />
                        {snap.fileCount} files ({(snap.totalBytes / 1024).toFixed(0)} KB)
                      </span>
                      <span>•</span>
                      <span>{new Date(snap.createdAt).toLocaleString()}</span>
                    </div>

                    {isFailed && snap.errorMessage && (
                      <p className="text-xs text-rose-400 pt-1 font-mono">
                        Error: {mapSnapshotErrorMessage(snap.errorMessage)}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Link to={`/app/snapshots/${snap.id}`}>
                      <Button size="sm" variant="secondary" className="text-xs">
                        Inspect snapshot →
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload ZIP Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 border-gray-800 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-850">
              <h3 className="text-base font-display font-bold text-white">
                Upload Repository Snapshot
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Dropzone area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-500/10"
                    : uploadFile
                    ? "border-emerald-500/40 bg-gray-900/60"
                    : "border-gray-700 hover:border-gray-600 bg-gray-900/30"
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".zip"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-emerald-300 truncate font-mono">
                      {uploadFile.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-300">
                      Drag & drop your repository <span className="text-emerald-400 font-mono">.zip</span> here, or click to browse
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Standard ZIP archives up to 25 MB supported. Secrets & binaries are automatically filtered.
                    </p>
                  </div>
                )}
              </div>

              {/* Optional label input */}
              <div className="space-y-1">
                <label className="text-xs text-gray-300 font-medium">
                  Snapshot Label (Optional)
                </label>
                <Input
                  placeholder="e.g. v1.2.0-rc1 or release-candidate"
                  value={uploadLabel}
                  onChange={(e) => setUploadLabel(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* Client error */}
              {uploadClientError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadClientError}</span>
                </div>
              )}

              {/* Server error */}
              {uploadServerError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{uploadServerError}</span>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-850">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(false)}
                  disabled={uploadSnapshot.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!uploadFile || uploadSnapshot.isPending}
                  className="gap-1.5"
                >
                  {uploadSnapshot.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting ZIP...</span>
                    </>
                  ) : (
                    <span>Upload & Ingest</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
