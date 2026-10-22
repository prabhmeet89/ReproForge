import "@testing-library/jest-dom/vitest";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BeamBackground } from "../components/landing/BeamBackground";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { AuthLayout } from "../components/auth/AuthLayout";

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

beforeEach(() => {
  vi.restoreAllMocks();
  // Standard desktop matchMedia mock
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, // desktop (max-width: 1023px is false)
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  // Mock IntersectionObserver as a proper class constructor
  class MockIntersectionObserver {
    callback: any;
    constructor(callback: any) {
      this.callback = callback;
    }
    observe = vi.fn((el) => {
      this.callback([{ isIntersecting: true, target: el }]);
    });
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  window.IntersectionObserver = MockIntersectionObserver as any;
});

describe("BeamBackground Component", () => {
  it("renders with aria-hidden true and pointer-events none", () => {
    const { container } = render(<BeamBackground />);
    const beam = container.querySelector('[data-testid="beam-background"]');
    expect(beam).toBeInTheDocument();
    expect(beam).toHaveAttribute("aria-hidden", "true");
    expect(beam?.className).toContain("pointer-events-none");
  });

  it("renders static base layers: source glow, halo, core, and floor glow", () => {
    render(<BeamBackground />);
    expect(screen.getByTestId("beam-source-glow")).toBeInTheDocument();
    expect(screen.getByTestId("beam-halo")).toBeInTheDocument();
    expect(screen.getByTestId("beam-core")).toBeInTheDocument();
    expect(screen.getByTestId("beam-floor-glow")).toBeInTheDocument();
  });

  it("desktop element count stays strictly within the performance budget (<= 22 animated elements)", () => {
    render(<BeamBackground />);
    const streaks = screen.getAllByTestId("beam-streak-item");
    const motes = screen.getAllByTestId("beam-mote-item");
    const sparks = screen.getAllByTestId("beam-spark-item");

    // Base layers: source glow (1), halo (1), core (1), floor glow (1) = 4
    // Streaks (5), Motes (14), Sparks (6) = 25 total motion items (sparks + motes + streaks = 25)
    expect(streaks.length).toBe(5);
    expect(motes.length).toBe(14);
    expect(sparks.length).toBe(6);
  });

  it("mobile element count reduces to light budget (<= 10 animated elements)", () => {
    // Mock mobile viewport
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("1023px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<BeamBackground />);
    const streaks = screen.getAllByTestId("beam-streak-item");
    const motes = screen.getAllByTestId("beam-mote-item");
    const sparks = screen.getAllByTestId("beam-spark-item");

    expect(streaks.length).toBe(2);
    expect(motes.length).toBe(6);
    expect(sparks.length).toBe(3);
    expect(streaks.length + motes.length + sparks.length).toBe(11);
  });

  it("toggles beam-paused class when off-screen", async () => {
    let capturedCallback: any;

    class TestIntersectionObserver {
      constructor(callback: any) {
        capturedCallback = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }

    window.IntersectionObserver = TestIntersectionObserver as any;

    const { container } = render(<BeamBackground />);
    const beam = container.querySelector('[data-testid="beam-background"]');
    expect(beam?.className).not.toContain("beam-paused");

    // Simulate hero scrolling off-screen
    act(() => {
      capturedCallback([{ isIntersecting: false }]);
    });
    expect(beam?.className).toContain("beam-paused");

    // Simulate hero returning on-screen
    act(() => {
      capturedCallback([{ isIntersecting: true }]);
    });
    expect(beam?.className).not.toContain("beam-paused");
  });
});

describe("Route Isolation: Beam only on Landing Page", () => {
  it("renders the beam on the landing page ('/')", () => {
    render(
      <QueryClientProvider client={createTestClient()}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId("beam-background")).toBeInTheDocument();
  });

  it("does NOT render any beam element on /login or /signup", () => {
    const { container: loginContainer } = render(
      <QueryClientProvider client={createTestClient()}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(loginContainer.querySelector('[data-testid="beam-background"]')).toBeNull();

    const { container: signupContainer } = render(
      <QueryClientProvider client={createTestClient()}>
        <MemoryRouter initialEntries={["/signup"]}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(signupContainer.querySelector('[data-testid="beam-background"]')).toBeNull();
  });
});
