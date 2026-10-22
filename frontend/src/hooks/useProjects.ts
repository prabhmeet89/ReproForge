import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ProjectFormData } from "../lib/schemas";

export interface Project {
  id: string;
  name: string;
  repositoryUrl?: string;
  defaultBranch: string;
  createdAt: string;
  isDemo?: boolean;
}

export function useProjects(search?: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: ["projects", { search, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) params.append("search", search);
      const res = await apiFetch<Project[]>(`/api/projects?${params.toString()}`);
      return res;
    },
  });
}

export function useProject(id?: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      if (!id) throw new Error("Project ID is required");
      const res = await apiFetch<Project>(`/api/projects/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const res = await apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
