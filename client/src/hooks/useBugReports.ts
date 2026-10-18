import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { BugReportFormData } from "../lib/schemas";
import type { BugStatus } from "../lib/status";

export interface BugReport {
  id: string;
  projectId: string;
  title: string;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  affectedEndpoint?: string;
  stackTrace?: string;
  logs?: string;
  status: BugStatus;
  createdAt: string;
  isDemo?: boolean;
}

export interface BugReportsFilter {
  projectId?: string;
  status?: string;
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
}

export function useBugReports(filters: BugReportsFilter = {}) {
  const { projectId, status, sort = "newest", page = 1, limit = 10 } = filters;

  return useQuery({
    queryKey: ["bug-reports", { projectId, status, sort, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort,
      });
      if (projectId) params.append("projectId", projectId);
      if (status && status !== "all") params.append("status", status);

      const res = await apiFetch<BugReport[]>(`/api/bug-reports?${params.toString()}`);
      return res;
    },
  });
}

export function useBugReport(id?: string) {
  return useQuery({
    queryKey: ["bug-report", id],
    queryFn: async () => {
      if (!id) throw new Error("Bug report ID is required");
      const res = await apiFetch<BugReport>(`/api/bug-reports/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateBugReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BugReportFormData) => {
      const res = await apiFetch<BugReport>("/api/bug-reports", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
