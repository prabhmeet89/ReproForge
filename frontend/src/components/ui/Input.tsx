import React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  showErrorText?: boolean;
  leftIcon?: React.ReactNode;
  isValid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      error,
      label,
      id,
      showErrorText = true,
      leftIcon,
      isValid = false,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-gray-300">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              "w-full rounded-full border border-gray-800/90 bg-[#060913]/90 px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 transition-all duration-150 focus:border-emerald-500/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-50",
              leftIcon && "pl-11",
              isValid && !error && "border-emerald-500/50 pr-9",
              error && "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20",
              className
            )}
            {...props}
          />
        </div>
        {error && showErrorText && (
          <p id={`${id}-error`} role="alert" className="text-xs text-rose-400 mt-1 pl-3">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
