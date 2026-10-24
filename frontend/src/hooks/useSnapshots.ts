import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type {
  Snapshot,
  SnapshotFile,
  SnapshotFileContent,
  ContextPreviewResult,
} from "../types/snapshots";
import type { BugReport } from "./useBugReports";

export function useSnapshots(projectId?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: ["snapshots", projectId, { page, limit }],
    queryFn: async () => {
      if (!projectId) return { data: [], meta: { page: 1, limit, total: 0, totalPages: 1 } };
      const res = await apiFetch<Snapshot[]>(
        `/api/projects/${projectId}/snapshots?page=${page}&limit=${limit}`
      );
      return res;
    },
    enabled: Boolean(projectId),
  });
}

export function useSnapshot(id?: string) {
  return useQuery({
    queryKey: ["snapshot", id],
    queryFn: async () => {
      if (!id) throw new Error("Snapshot ID required");
      const res = await apiFetch<Snapshot>(`/api/snapshots/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export interface SnapshotFilesFilter {
  kind?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function useSnapshotFiles(snapshotId?: string, filter: SnapshotFilesFilter = {}) {
  const { kind, search, page = 1, limit = 50 } = filter;

  return useQuery({
    queryKey: ["snapshot-files", snapshotId, { kind, search, page, limit }],
    queryFn: async () => {
      if (!snapshotId) return { data: [], meta: { page: 1, limit, total: 0, totalPages: 1 } };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (kind && kind !== "all") params.append("kind", kind);
      if (search && search.trim()) params.append("search", search.trim());

      const res = await apiFetch<SnapshotFile[]>(
        `/api/snapshots/${snapshotId}/files?${params.toString()}`
      );
      return res;
    },
    enabled: Boolean(snapshotId),
  });
}

export function useSnapshotFileContent(snapshotId?: string, filePath?: string) {
  return useQuery({
    queryKey: ["snapshot-file-content", snapshotId, filePath],
    queryFn: async () => {
      if (!snapshotId || !filePath) throw new Error("Snapshot ID and file path required");
      const res = await apiFetch<SnapshotFileContent>(
        `/api/snapshots/${snapshotId}/files/content?path=${encodeURIComponent(filePath)}`
      );
      return res.data;
    },
    enabled: Boolean(snapshotId && filePath),
  });
}

export function useUploadSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      file,
      label,
    }: {
      projectId: string;
      file: File;
      label?: string;
    }) => {
      const formData = new FormData();
      formData.append("archive", file);
      if (label && label.trim()) {
        formData.append("label", label.trim());
      }

      const res = await apiFetch<Snapshot>(`/api/projects/${projectId}/snapshots`, {
        method: "POST",
        body: formData,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", variables.projectId] });
    },
  });
}

export function useIngestSampleSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      sampleName = "payment-order-bug",
      label,
    }: {
      projectId: string;
      sampleName?: string;
      label?: string;
    }) => {
      const res = await apiFetch<Snapshot>(`/api/projects/${projectId}/snapshots/sample`, {
        method: "POST",
        body: JSON.stringify({ sampleName, label }),
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", variables.projectId] });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; projectId: string }) => {
      await apiFetch<null>(`/api/snapshots/${id}`, {
        method: "DELETE",
      });
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", variables.projectId] });
      queryClient.removeQueries({ queryKey: ["snapshot", variables.id] });
      queryClient.removeQueries({ queryKey: ["snapshot-files", variables.id] });
    },
  });
}

export function useContextPreview(bugReportId?: string) {
  return useQuery({
    queryKey: ["context-preview", bugReportId],
    queryFn: async () => {
      if (!bugReportId) throw new Error("Bug report ID required");
      const res = await apiFetch<ContextPreviewResult>(
        `/api/bug-reports/${bugReportId}/context-preview`
      );
      return res.data;
    },
    enabled: Boolean(bugReportId),
    retry: false, // Don't loop on 400 when no snapshot attached
  });
}

export function useAttachSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bugReportId,
      snapshotId,
    }: {
      bugReportId: string;
      snapshotId: string;
    }) => {
      const res = await apiFetch<BugReport>(`/api/bug-reports/${bugReportId}/snapshot`, {
        method: "PATCH",
        body: JSON.stringify({ snapshotId }),
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bug-report", variables.bugReportId] });
      queryClient.invalidateQueries({ queryKey: ["context-preview", variables.bugReportId] });
    },
  });
}
