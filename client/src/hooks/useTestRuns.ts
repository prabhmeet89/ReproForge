import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface TestRun {
  id: string;
  bugReportId: string;
  status: "queued" | "running" | "passed" | "failed" | "error";
  exitCode?: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  createdAt: string;
  isDemo?: boolean;
}

export function useTestRuns(bugReportId?: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: ["test-runs", { bugReportId, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (bugReportId) params.append("bugReportId", bugReportId);

      const res = await apiFetch<TestRun[]>(`/api/test-runs?${params.toString()}`);
      return res;
    },
  });
}

export function useTestRun(id?: string) {
  return useQuery({
    queryKey: ["test-run", id],
    queryFn: async () => {
      if (!id) throw new Error("Test run ID is required");
      const res = await apiFetch<TestRun>(`/api/test-runs/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}
