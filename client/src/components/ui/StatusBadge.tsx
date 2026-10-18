import type { BugStatus } from "../../lib/status";
import { STATUS_CONFIG } from "../../lib/status";
import { cn } from "../../lib/utils";

export interface StatusBadgeProps {
  status: BugStatus | string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as BugStatus] || STATUS_CONFIG.submitted;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors select-none",
        config.badgeClass,
        className
      )}
      title={config.description}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)} />}
      <span>{config.label}</span>
    </span>
  );
}
