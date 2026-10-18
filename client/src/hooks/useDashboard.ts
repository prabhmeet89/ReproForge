import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { BugReport } from "./useBugReports";
import type { TestRun } from "./useTestRuns";

export interface DashboardSummary {
  counts: {
    projects: number;
    bugReports: number;
    reproduced: number;
    unverified: number;
    investigating: number;
    submitted: number;
    testRuns: number;
  };
  recentBugReports: BugReport[];
  recentTestRuns: TestRun[];
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await apiFetch<DashboardSummary>("/api/dashboard/summary");
      return res.data;
    },
    refetchInterval: 15000, // Refresh every 15s to keep dashboard live
  });
}
