import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateBugReportPage } from "../pages/CreateBugReportPage";
import * as apiModule from "../lib/api";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("CreateBugReportPage Form", () => {
  it("displays client-side validation errors when submitting empty form", async () => {
    renderWithProviders(<CreateBugReportPage />);

    const submitBtn = screen.getByRole("button", { name: /submit & enqueue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/please select a project/i)).toBeInTheDocument();
      expect(screen.getByText(/title must be at least 5 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/expected behavior must be at least 5 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/actual behavior must be at least 5 characters/i)).toBeInTheDocument();
    });
  });

  it("maps server 422 field errors onto form inputs when API rejects", async () => {
    // Mock apiFetch to return a simulated 422 error
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/projects")) {
        return { success: true, data: [{ id: "proj-1", name: "Sample App", defaultBranch: "main", createdAt: "" }] } as any;
      }
      if (endpoint.startsWith("/api/bug-reports")) {
        throw new apiModule.ApiError("Validation failed", 422, [
          { field: "title", message: "Server rejected title: duplicate entry detected" },
        ]);
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(<CreateBugReportPage />);

    // Fill valid minimum values so client-side passes
    fireEvent.change(screen.getByLabelText(/bug title \*/i), {
      target: { value: "Valid Title Test" },
    });
    fireEvent.change(screen.getByLabelText(/detailed description \*/i), {
      target: { value: "Valid description longer than 10 characters" },
    });
    fireEvent.change(screen.getByLabelText(/expected behavior \*/i), {
      target: { value: "Valid expected behavior" },
    });
    fireEvent.change(screen.getByLabelText(/actual behavior \*/i), {
      target: { value: "Valid actual behavior" },
    });

    // Wait for project select to populate
    await waitFor(() => {
      const select = screen.getByLabelText(/target project \*/i) as HTMLSelectElement;
      expect(select.options.length).toBeGreaterThan(1);
    });

    fireEvent.change(screen.getByLabelText(/target project \*/i), {
      target: { value: "proj-1" },
    });

    const submitBtn = screen.getByRole("button", { name: /submit & enqueue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/server rejected title: duplicate entry detected/i)
      ).toBeInTheDocument();
    });

    vi.restoreAllMocks();
  });
});
