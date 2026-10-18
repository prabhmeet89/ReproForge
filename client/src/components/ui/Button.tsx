import React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-6 py-2.5 gap-2.5",
    };

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-emerald-500 to-teal-500 text-gray-950 font-semibold shadow-lg shadow-emerald-500/20 hover:brightness-110 hover:shadow-emerald-500/30",
      secondary:
        "bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-750 hover:border-gray-600",
      outline:
        "bg-transparent text-gray-200 border border-gray-800 hover:bg-gray-900 hover:border-gray-700",
      ghost:
        "bg-transparent text-gray-400 hover:text-gray-100 hover:bg-gray-900/60",
      danger:
        "bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
