import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusBadge } from "../components/ui/StatusBadge";

describe("StatusBadge Component", () => {
  it("renders 'Submitted' label with gray variant", () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });

  it("renders 'AI Hypothesis' label with violet variant for investigated status (never green)", () => {
    const { container } = render(<StatusBadge status="investigated" />);
    expect(screen.getByText("AI Hypothesis")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("text-violet-300");
  });

  it("renders 'Reproduced' with emerald styling for confirmed reproduction", () => {
    const { container } = render(<StatusBadge status="reproduced" />);
    expect(screen.getByText("Reproduced")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("text-emerald-300");
  });

  it("falls back gracefully to submitted for unrecognized status strings", () => {
    render(<StatusBadge status="unknown_status_xyz" />);
    expect(screen.getByText("Submitted")).toBeInTheDocument();
  });
});
