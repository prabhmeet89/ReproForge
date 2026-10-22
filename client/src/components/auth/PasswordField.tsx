import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "../ui/Input";
import type { InputProps } from "../ui/Input";

/**
 * A password input with a show/hide toggle.
 *
 * The toggle is a plain button rather than a custom control, so it needs
 * an explicit `type="button"` — inside a form a default `type="submit"`
 * would submit the form when the user just wanted to see the password.
 */
export function PasswordField({
  id,
  label,
  error,
  autoComplete,
  ...props
}: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          error={error}
          showErrorText={false}
          className="pr-10"
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
