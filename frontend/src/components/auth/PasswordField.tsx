import React, { useState } from "react";
import { Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { Input } from "../ui/Input";
import type { InputProps } from "../ui/Input";
import { cn } from "../../lib/utils";

export interface PasswordFieldProps extends InputProps {
  onCapsWarningChange?: (isCaps: boolean) => void;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ id, label, error, autoComplete, className, onKeyDown, onKeyUp, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);

    const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const isCaps = e.getModifierState("CapsLock");
      setCapsLockActive(isCaps);
    };

    return (
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="block text-xs font-medium text-gray-300">
              {label}
            </label>
          )}
          {capsLockActive && (
            <span
              role="status"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 select-none animate-pulse"
            >
              <AlertTriangle className="w-3 h-3" />
              Caps Lock is on
            </span>
          )}
        </div>

        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Lock className="w-4 h-4" />
          </div>

          <Input
            id={id}
            ref={ref}
            type={visible ? "text" : "password"}
            autoComplete={autoComplete}
            error={error}
            showErrorText={false}
            className={cn("pl-11 pr-11", className)}
            onKeyDown={(e) => {
              handleKeyModifier(e);
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              handleKeyModifier(e);
              onKeyUp?.(e);
            }}
            {...props}
          />

          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors p-1.5 rounded-full hover:bg-gray-800/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs text-rose-400 mt-1 pl-3">
            {error}
          </p>
        )}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";
