import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectDetailPage } from "../pages/ProjectDetailPage";
import { SnapshotDetailPage } from "../pages/SnapshotDetailPage";
import { BugReportDetailPage } from "../pages/BugReportDetailPage";
import { CreateBugReportPage } from "../pages/CreateBugReportPage";
import { mapSnapshotErrorMessage } from "../types/snapshots";
import * as apiModule from "../lib/api";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

function renderWithRouter(ui: React.ReactElement, initialPath = "/") {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Snapshots & Context Preview (Step 3D Frontend)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Error code mapping", () => {
    it("maps all snapshot server error codes to clear, friendly user messages", () => {
      expect(mapSnapshotErrorMessage("ARCHIVE_TOO_LARGE")).toContain("25 MB");
      expect(mapSnapshotErrorMessage("ZIP_BOMB")).toContain("suspicious compression ratio");
      expect(mapSnapshotErrorMessage("QUOTA_EXCEEDED")).toContain("limit reached");
      expect(mapSnapshotErrorMessage("INVALID_ARCHIVE")).toContain("valid ZIP archive");
      expect(mapSnapshotErrorMessage("UNSAFE_PATH")).toContain("unsafe or invalid file paths");
      expect(mapSnapshotErrorMessage("TOO_MANY_FILES")).toContain("5,000 files");
      expect(mapSnapshotErrorMessage("EMPTY_SNAPSHOT")).toContain("no ingestible source or configuration files");
      expect(mapSnapshotErrorMessage("Some custom error")).toBe("Some custom error");
    });
  });

  describe("2. Project detail page & client-side upload validation", () => {
    it("rejects non-zip files and oversized files client-side before network request", async () => {
      vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
        if (endpoint === "/api/projects/proj-123") {
          return {
            success: true,
            data: { id: "proj-123", name: "Order Service", defaultBranch: "main", createdAt: "2026-10-24" },
          } as any;
        }
        if (endpoint.startsWith("/api/projects/proj-123/snapshots")) {
          return { success: true, data: [] } as any;
        }
        return { success: true, data: {} } as any;
      });

      renderWithRouter(
        <Routes>
          <Route path="/app/projects/:id" element={<ProjectDetailPage />} />
        </Routes>,
        "/app/projects/proj-123"
      );

      // Wait for project to load
      await waitFor(() => {
        expect(screen.getByText("Order Service")).toBeInTheDocument();
      });

      // Open the Upload ZIP modal
      const uploadBtn = screen.getAllByRole("button", { name: /upload zip/i })[0];
      fireEvent.click(uploadBtn);


      expect(screen.getByText("Upload Repository Snapshot")).toBeInTheDocument();

      // Find file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Test 1: Reject non-zip file
      const textFile = new File(["dummy content"], "project.tar.gz", { type: "application/gzip" });
      fireEvent.change(fileInput, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/only \.zip archives are supported/i)
        ).toBeInTheDocument();
      });

      // Test 2: Reject oversized file (> 25MB)
      const bigFile = new File([new Uint8Array(26 * 1024 * 1024)], "huge.zip", {
        type: "application/zip",
      });
      fireEvent.change(fileInput, { target: { files: [bigFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/exceeds the maximum allowed limit of 25 mb/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("3. Snapshot detail page secrets warning banner", () => {
    it("renders the amber warning banner when secretFindingCount > 0", async () => {
      vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
        if (endpoint === "/api/snapshots/snap-secrets") {
          return {
            success: true,
            data: {
              id: "snap-secrets",
              projectId: "proj-1",
              source: "zip",
              status: "ready",
              contentHash: "abcdef123456",
              fileCount: 15,
              totalBytes: 50000,
              excludedCount: 3,
              secretFindingCount: 2,
              createdAt: "2026-10-24",
              analysis: {
                framework: "express",
                testFramework: "jest",
                scripts: { test: "jest" },
                moduleSystem: "commonjs",
                isTypeScript: false,
                supported: true,
                supportReasons: ["Express supported"],
              },
            },
          } as any;
        }
        if (endpoint.startsWith("/api/snapshots/snap-secrets/files")) {
          return {
            success: true,
            data: [
              {
                id: "f1",
                path: "src/config.js",
                kind: "source",
                lineCount: 20,
                size: 500,
                secretFindings: [{ type: "generic_secret", line: 4 }],
              },
            ],
          } as any;
        }
        return { success: true, data: {} } as any;
      });

      renderWithRouter(
        <Routes>
          <Route path="/app/snapshots/:id" element={<SnapshotDetailPage />} />
        </Routes>,
        "/app/snapshots/snap-secrets"
      );

      await waitFor(() => {
        expect(
          screen.getByText(/possible secrets found in 1 files\. values are never shown and are redacted from ai context\./i)
        ).toBeInTheDocument();
      });
    });

    it("does NOT render the secrets banner when secretFindingCount === 0", async () => {
      vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
        if (endpoint === "/api/snapshots/snap-clean") {
          return {
            success: true,
            data: {
              id: "snap-clean",
              projectId: "proj-1",
              source: "zip",
              status: "ready",
              contentHash: "000000123456",
              fileCount: 10,
              totalBytes: 20000,
              excludedCount: 2,
              secretFindingCount: 0,
              createdAt: "2026-10-24",
              analysis: {
                framework: "express",
                supported: true,
              },
            },
          } as any;
        }
        if (endpoint.startsWith("/api/snapshots/snap-clean/files")) {
          return { success: true, data: [] } as any;
        }
        return { success: true, data: {} } as any;
      });

      renderWithRouter(
        <Routes>
          <Route path="/app/snapshots/:id" element={<SnapshotDetailPage />} />
        </Routes>,
        "/app/snapshots/snap-clean"
      );

      await waitFor(() => {
        expect(screen.getByText(/snapshot 00000012/i)).toBeInTheDocument();
      });

      expect(
        screen.queryByText(/possible secrets found/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("4. Relevant files panel on BugReportDetailPage", () => {
    it("renders reasons chips, context-size meter, and the visible heuristic label", async () => {
      vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
        if (endpoint === "/api/bug-reports/bug-1") {
          return {
            success: true,
            data: {
              id: "bug-1",
              projectId: "proj-1",
              title: "Payment drift bug",
              description: "Fails when paying 59.97",
              expectedBehavior: "Expected paid",
              actualBehavior: "Remains pending",
              status: "submitted",
              createdAt: "2026-10-24",
              snapshotId: "snap-1",
            },
          } as any;
        }
        if (endpoint === "/api/snapshots/snap-1") {
          return {
            success: true,
            data: {
              id: "snap-1",
              projectId: "proj-1",
              source: "sample",
              contentHash: "hash1234",
              fileCount: 4,
              totalBytes: 8000,
              createdAt: "2026-10-24",
            },
          } as any;
        }
        if (endpoint === "/api/bug-reports/bug-1/context-preview") {
          return {
            success: true,
            data: {
              snapshot: { id: "snap-1", contentHash: "hash1234", commitSha: null },
              parsedStack: {
                errorType: "Error",
                message: "Amount mismatch",
                frames: [],
              },
              matchedFrames: [
                {
                  frame: { raw: "at processPayment (/app/src/orders.js:78:11)", function: "processPayment", file: "/app/src/orders.js", line: 78, column: 11, kind: "project" },
                  matchStatus: "matched",
                  matchedPath: "src/orders.js",
                },
              ],
              files: [
                {
                  path: "src/orders.js",
                  language: "javascript",
                  kind: "source",
                  reasons: ["stack frame #1 (line 78)", "contains affectedEndpoint"],
                  ranges: [{ start: 38, end: 118 }],
                  content: "function processPayment() {}",
                  truncated: false,
                },
              ],
              totalBytes: 38912,
              limitBytes: 61440,
              warnings: [],
              method: "heuristic",
            },
          } as any;
        }
        return { success: true, data: {} } as any;
      });

      renderWithRouter(
        <Routes>
          <Route path="/app/bug-reports/:id" element={<BugReportDetailPage />} />
        </Routes>,
        "/app/bug-reports/bug-1"
      );

      await waitFor(() => {
        // Visible heuristic label
        expect(
          screen.getByText("Heuristic selection. No AI was used.")
        ).toBeInTheDocument();

        // Reason chips
        expect(screen.getByText("stack frame #1 (line 78)")).toBeInTheDocument();
        expect(screen.getByText("contains affectedEndpoint")).toBeInTheDocument();

        // Context size meter
        expect(screen.getByText(/38\.0 KB of 60 KB/i)).toBeInTheDocument();

        // Frame badge
        expect(screen.getByText("Matched: src/orders.js")).toBeInTheDocument();
      });
    });
  });

  describe("5. Bug report form snapshot select filtering", () => {
    it("only lists ready snapshots for the chosen project", async () => {
      vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
        if (endpoint.includes("/snapshots")) {
          if (endpoint.includes("proj-A")) {
            return {
              success: true,
              data: [
                { id: "snap-A1", status: "ready", label: "Alpha Ready Snapshot", fileCount: 12, contentHash: "aaa111" },
                { id: "snap-A2", status: "processing", label: "Alpha Processing", fileCount: 0, contentHash: "aaa222" },
              ],
            } as any;
          }
          if (endpoint.includes("proj-B")) {
            return {
              success: true,
              data: [
                { id: "snap-B1", status: "ready", label: "Beta Ready Snapshot", fileCount: 8, contentHash: "bbb111" },
              ],
            } as any;
          }
        }
        if (endpoint.startsWith("/api/projects")) {
          return {
            success: true,
            data: [
              { id: "proj-A", name: "Project Alpha" },
              { id: "proj-B", name: "Project Beta" },
            ],
          } as any;
        }
        return { success: true, data: [] } as any;
      });


      renderWithRouter(<CreateBugReportPage />);

      // Wait for projects to load
      await waitFor(() => {
        const projSelect = screen.getByLabelText(/target project \*/i) as HTMLSelectElement;
        expect(projSelect.options.length).toBe(3); // placeholder + 2 projects
      });

      // Snapshot select disabled when no project chosen
      const snapSelect = screen.getByLabelText(/attached codebase snapshot/i) as HTMLSelectElement;
      expect(snapSelect).toBeDisabled();

      // Select Project Alpha
      fireEvent.change(screen.getByLabelText(/target project \*/i), {
        target: { value: "proj-A" },
      });

      await waitFor(() => {
        expect(snapSelect).not.toBeDisabled();
        // Should contain placeholder + Alpha Ready Snapshot ONLY (not processing)
        expect(snapSelect.options.length).toBe(2);
        expect(screen.getByText(/alpha ready snapshot/i)).toBeInTheDocument();
        expect(screen.queryByText(/alpha processing/i)).not.toBeInTheDocument();
      });

      // Switch to Project Beta
      fireEvent.change(screen.getByLabelText(/target project \*/i), {
        target: { value: "proj-B" },
      });

      await waitFor(() => {
        expect(screen.getByText(/beta ready snapshot/i)).toBeInTheDocument();
        expect(screen.queryByText(/alpha ready snapshot/i)).not.toBeInTheDocument();
      });
    });
  });
});
