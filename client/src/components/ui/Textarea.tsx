import React from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
  characterCount?: { current: number; max: number };
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, label, id, characterCount, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="block text-xs font-medium text-gray-300">
              {label}
            </label>
          )}
          {characterCount && (
            <span
              className={cn(
                "text-[11px] font-mono",
                characterCount.current > characterCount.max
                  ? "text-rose-400 font-semibold"
                  : "text-gray-500"
              )}
            >
              {characterCount.current} / {characterCount.max}
            </span>
          )}
        </div>
        <textarea
          id={id}
          ref={ref}
          className={cn(
            "w-full rounded-xl border border-gray-800 bg-gray-950/80 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 min-h-[90px] resize-y",
            error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
