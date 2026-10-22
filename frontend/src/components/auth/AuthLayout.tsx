import { Link } from "react-router-dom";
import { Terminal } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * The shared shell for the login and signup pages.
 *
 * It deliberately reuses the console's visual language — dark background,
 * emerald accent, Space Grotesk headings — so the auth pages feel like
 * part of the product rather than a bolted-on form.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
            <Terminal className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm text-white tracking-tight">
            ReproForge
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="font-display font-bold text-2xl text-white tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-gray-400">{subtitle}</p>
          </div>

          {children}

          {footer && (
            <div className="text-center text-sm text-gray-400">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * A form-level error banner. Used for failures that belong to the whole
 * request rather than to a single field.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className={cn(
        "p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs"
      )}
    >
      {message}
    </div>
  );
}
