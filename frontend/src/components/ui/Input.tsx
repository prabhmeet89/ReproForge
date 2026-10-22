import React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  /**
   * Renders the error message below the field. Set it to false when a
   * wrapper renders the message itself — the error styling on the border
   * still applies either way.
   */
  showErrorText?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, id, showErrorText = true, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3.5 py-2 text-sm text-gray-100 placeholder:text-gray-600 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50",
            error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
        {error && showErrorText && (
          <p className="text-xs text-rose-400 mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
