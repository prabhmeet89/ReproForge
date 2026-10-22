import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { useLogout } from "../hooks/useAuth";
import * as apiModule from "../lib/api";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

/**
 * `initialEntries` lets a test start the router on a specific URL, which
 * is what the route guards are about.
 */
function renderWithProviders(
  ui: React.ReactElement,
  client = createTestQueryClient(),
  initialEntries: string[] = ["/"]
) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

/** Renders the current path so a test can assert where a guard sent it. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{`${location.pathname}${location.search}`}</div>;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("shows client-side validation errors when submitting an empty form", async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, "apiFetch")
      .mockResolvedValue({ success: true, data: {} } as any);

    renderWithProviders(<LoginPage />);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email cannot be empty/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 10 characters/i)).toBeInTheDocument();
    });

    // The server was never called — the form did not pass client validation.
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a password shorter than 10 characters before hitting the server", async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, "apiFetch")
      .mockResolvedValue({ success: true, data: {} } as any);

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 10 characters/i)).toBeInTheDocument();
    });
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a malformed email before hitting the server", async () => {
    const apiFetchSpy = vi
      .spyOn(apiModule, "apiFetch")
      .mockResolvedValue({ success: true, data: {} } as any);

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-long-enough-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email must be a valid email address/i)).toBeInTheDocument();
    });
    expect(apiFetchSpy).not.toHaveBeenCalled();
  });

  it("maps server field errors onto the matching form input", async () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/login")) {
        throw new apiModule.ApiError("Validation failed", 422, [
          { field: "email", message: "Server rejected email: already in use" },
        ]);
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-long-enough-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/server rejected email: already in use/i)
      ).toBeInTheDocument();
    });
  });

  it("shows the server message when the credentials are rejected", async () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/login")) {
        throw new apiModule.ApiError("Invalid email or password", 401);
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "a-long-enough-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it("toggles password visibility", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      success: true,
      data: {},
    } as any);

    renderWithProviders(<LoginPage />);

    const password = screen.getByLabelText("Password") as HTMLInputElement;
    expect(password.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(password.type).toBe("password");
    expect(screen.getByRole("button", { name: /show password/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("detects and displays Caps Lock warning when active", async () => {
    renderWithProviders(<LoginPage />);

    const passwordInput = screen.getByLabelText("Password");
    expect(screen.queryByText(/caps lock is on/i)).not.toBeInTheDocument();

    fireEvent.keyDown(passwordInput, {
      key: "a",
      modifierCapsLock: true,
      getModifierState: (key: string) => key === "CapsLock",
    });

    expect(screen.getByText(/caps lock is on/i)).toBeInTheDocument();
  });

  it("shows friendly rate limit message on 429 response", async () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/login")) {
        throw new apiModule.ApiError("Too Many Requests", 429);
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "validpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/too many sign in attempts/i)
      ).toBeInTheDocument();
    });
  });

  it("uses the autocomplete attributes the browser expects", async () => {
    vi.spyOn(apiModule, "apiFetch").mockResolvedValue({
      success: true,
      data: {},
    } as any);

    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password"
    );
  });
});

describe("ProtectedRoute", () => {
  it("redirects to /login with returnTo when /me returns 401", async () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/me")) {
        throw new apiModule.ApiError("Authentication required", 401);
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(
      <>
        <LocationProbe />
        <Routes>
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <div>Secret dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </>,
      createTestQueryClient(),
      ["/app/bug-reports/abc-123"]
    );

    // The protected content must never appear.
    await waitFor(() => {
      expect(screen.getByText(/login page/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/secret dashboard/i)).not.toBeInTheDocument();

    // The guard sent the user to /login and kept where they were going.
    await waitFor(() => {
      expect(screen.getByTestId("current-path")).toHaveTextContent(
        "/login?returnTo=%2Fapp%2Fbug-reports%2Fabc-123"
      );
    });
  });

  it("renders the protected content when a session exists", async () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/me")) {
        return {
          success: true,
          data: { id: "u1", email: "user@example.com", createdAt: "" },
        } as any;
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>,
      createTestQueryClient(),
      ["/app"]
    );

    await waitFor(() => {
      expect(screen.getByText(/secret dashboard/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/login page/i)).not.toBeInTheDocument();
  });

  it("shows a skeleton while /me is still loading", async () => {
    // A promise that never settles keeps the query pending.
    vi.spyOn(apiModule, "apiFetch").mockImplementation(
      async (endpoint: string) => {
        if (endpoint.startsWith("/api/auth/me")) {
          return new Promise(() => {});
        }
        return { success: true, data: {} } as any;
      }
    );

    const { container } = renderWithProviders(
      <Routes>
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>,
      createTestQueryClient(),
      ["/app"]
    );

    // The skeleton is a pulsing div; the protected content is not shown.
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText(/secret dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/login page/i)).not.toBeInTheDocument();
  });
});

describe("useLogout", () => {
  it("clears the whole query cache on logout", async () => {
    const client = createTestQueryClient();

    // A cached query, as if the logged-in user had loaded their projects.
    await client.prefetchQuery({
      queryKey: ["projects"],
      queryFn: async () => [{ id: "p1" }],
    });
    expect(client.getQueryData(["projects"])).toBeDefined();

    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/logout")) {
        return { success: true, data: null } as any;
      }
      return { success: true, data: {} } as any;
    });

    function LogoutButton() {
      const logout = useLogout();
      return (
        <button onClick={() => logout.mutate()}>
          {logout.isPending ? "Logging out" : "Log out"}
        </button>
      );
    }

    renderWithProviders(<LogoutButton />, client);

    fireEvent.click(screen.getByRole("button", { name: /log out/i }));

    await waitFor(() => {
      expect(client.getQueryData(["projects"])).toBeUndefined();
    });
  });
});

describe("SignupPage", () => {
  it("computes and displays password strength dynamically", async () => {
    renderWithProviders(<SignupPage />);

    const passwordInput = screen.getByLabelText("Password");
    expect(screen.queryByTestId("strength-label")).not.toBeInTheDocument();

    // Weak password
    fireEvent.change(passwordInput, { target: { value: "simple" } });
    expect(screen.getByTestId("strength-label")).toHaveTextContent(/weak/i);

    // Strong password (length >= 14, uppercase + lowercase, digits + symbols)
    fireEvent.change(passwordInput, { target: { value: "SuperSecur3!P@ssword" } });
    expect(screen.getByTestId("strength-label")).toHaveTextContent(/strong/i);
  });

  it("handles duplicate email (409) and binds message to email field", async () => {
    vi.spyOn(apiModule, "apiFetch").mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/api/auth/signup")) {
        throw new apiModule.ApiError("An account with this email already exists", 409);
      }
      return { success: true, data: {} } as any;
    });

    renderWithProviders(<SignupPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "validpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/an account with this email already exists/i)
      ).toBeInTheDocument();
    });
  });

  it("sets autocomplete to new-password", () => {
    renderWithProviders(<SignupPage />);
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
  });
});
