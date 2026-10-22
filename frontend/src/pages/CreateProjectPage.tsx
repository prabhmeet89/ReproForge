import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { projectFormSchema } from "../lib/schemas";
import type { ProjectFormData } from "../lib/schemas";
import { useCreateProject } from "../hooks/useProjects";
import { ApiError } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Toast } from "../components/ui/Toast";

export function CreateProjectPage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      repositoryUrl: "",
      defaultBranch: "main",
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    try {
      await createProject.mutateAsync(data);
      setToastMessage("Project created successfully!");
      setTimeout(() => {
        navigate("/app/projects");
      }, 1000);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        err.errors.forEach((fieldError) => {
          setError(fieldError.field as keyof ProjectFormData, {
            type: "server",
            message: fieldError.message,
          });
        });
      } else {
        setError("root", {
          message: err instanceof Error ? err.message : "Failed to create project",
        });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/app/projects"
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Create New Project</h2>
          <p className="text-xs text-gray-400 mt-0.5">Register a project codebase to trace bug reproductions</p>
        </div>
      </div>

      <Card className="p-6 border-gray-850">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {errors.root && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errors.root.message}
            </div>
          )}

          <Input
            id="name"
            label="Project Name *"
            placeholder="e.g. ecommerce-api"
            error={errors.name?.message}
            {...register("name")}
          />

          <Input
            id="repositoryUrl"
            label="Git Repository URL (Optional)"
            placeholder="https://github.com/organization/repository"
            error={errors.repositoryUrl?.message}
            {...register("repositoryUrl")}
          />

          <Input
            id="defaultBranch"
            label="Default Branch *"
            placeholder="main"
            error={errors.defaultBranch?.message}
            {...register("defaultBranch")}
          />

          <div className="pt-4 border-t border-gray-850 flex items-center justify-end gap-3">
            <Link to="/app/projects">
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting || createProject.isPending}
            >
              Create Project
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
