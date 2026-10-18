export type BugStatus =
  | "submitted"
  | "investigating"
  | "investigated"
  | "test_generated"
  | "reproduced"
  | "unverified"
  | "failed";

export interface StatusConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
  variant: "emerald" | "amber" | "violet" | "blue" | "rose" | "gray";
  description: string;
}

// Centralized status definition ensuring consistency across the entire app
// Note: AI hypothesis states use violet, NEVER emerald verified style.
export const STATUS_CONFIG: Record<BugStatus, StatusConfig> = {
  submitted: {
    label: "Submitted",
    badgeClass: "bg-gray-800/80 text-gray-300 border-gray-700",
    dotClass: "bg-gray-400",
    borderClass: "border-gray-700",
    variant: "gray",
    description: "Bug report received, waiting for reproduction queue",
  },
  investigating: {
    label: "Investigating",
    badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    dotClass: "bg-amber-400 animate-pulse",
    borderClass: "border-amber-500/30",
    variant: "amber",
    description: "AI agent analyzing codebase context & call stacks",
  },
  investigated: {
    label: "AI Hypothesis",
    badgeClass: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    dotClass: "bg-violet-400",
    borderClass: "border-violet-500/30",
    variant: "violet",
    description: "Preliminary root cause isolated (unverified hypothesis)",
  },
  test_generated: {
    label: "Test Generated",
    badgeClass: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    dotClass: "bg-blue-400",
    borderClass: "border-blue-500/30",
    variant: "blue",
    description: "Executable reproduction test written, pending container execution",
  },
  reproduced: {
    label: "Reproduced",
    badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    dotClass: "bg-emerald-400",
    borderClass: "border-emerald-500/30",
    variant: "emerald",
    description: "Bug confirmed by isolated Docker sandbox execution",
  },
  unverified: {
    label: "Unverified",
    badgeClass: "bg-orange-500/10 text-orange-300 border-orange-500/30",
    dotClass: "bg-orange-400",
    borderClass: "border-orange-500/30",
    variant: "amber",
    description: "Could not trigger fault with current test parameters",
  },
  failed: {
    label: "Execution Failed",
    badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    dotClass: "bg-rose-400",
    borderClass: "border-rose-500/30",
    variant: "rose",
    description: "Sandbox container setup or runtime error",
  },
};
