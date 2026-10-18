import React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "emerald" | "amber" | "violet" | "blue" | "rose" | "gray";
  dot?: boolean;
}

export function Badge({
  className,
  variant = "gray",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    gray: "bg-gray-800 text-gray-300 border-gray-700",
  };

  const dotColors = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    violet: "bg-violet-400",
    blue: "bg-blue-400",
    rose: "bg-rose-400",
    gray: "bg-gray-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
