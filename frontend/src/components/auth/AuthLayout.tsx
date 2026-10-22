import { Link, Outlet } from "react-router-dom";
import { Terminal } from "lucide-react";

/**
 * Shared AuthLayout shell for /login and /signup.
 * Desktop (lg+): 55/45 split screen.
 * Left: 3-line Space Grotesk headline with distinct gradients, tagline, cropped watermark.
 * Right: glassmorphic container hosting the form card.
 * Mobile/Tablet: single column, compact header, full-width card.
 */
export function AuthLayout() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-[#05070D] text-gray-100 flex flex-col overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Static faint grid pattern with radial mask (no CursorGlow) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
        aria-hidden="true"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 65% 65% at 50% 50%, black 25%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 65% at 50% 50%, black 25%, transparent 80%)",
        }}
      />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Top bar with Logo & Tag */}
        <header className="px-6 py-5 sm:px-10 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform shadow-sm shadow-emerald-500/10">
              <Terminal className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-base text-white tracking-tight">
              ReproForge
            </span>
          </Link>
          <div className="text-[11px] text-gray-500 font-mono tracking-wider uppercase hidden sm:block">
            Bug-to-Repro AI
          </div>
        </header>

        {/* Split Screen Body */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-6 lg:py-10">
          <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Brand Panel (Desktop only ~55%) */}
            <div className="hidden lg:flex lg:col-span-7 flex-col justify-between self-stretch relative py-6 pr-6 select-none">
              <div className="space-y-6">
                {/* 3-line uppercase Space Grotesk headline */}
                <h1 className="font-display font-bold text-4xl xl:text-5xl tracking-tight leading-[1.08] uppercase space-y-1">
                  <div className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                    PROVE THE BUG.
                  </div>
                  <div className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300">
                    TRUST THE TEST.
                  </div>
                  <div className="text-gray-500/80">
                    SHIP THE FIX.
                  </div>
                </h1>

                {/* Short honest tagline */}
                <p className="text-sm text-gray-400 max-w-md leading-relaxed font-sans">
                  Evidence-backed bug reproduction for Node.js teams.
                </p>
              </div>

              {/* Giant bottom brand watermark (partly cropped by bottom edge, faded out towards top) */}
              <div
                aria-hidden="true"
                className="pointer-events-none mt-auto pt-16 overflow-hidden -mb-10 -ml-2"
                style={{
                  maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 85%)",
                  WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 85%)",
                }}
              >
                <span className="font-display font-extrabold text-[24vw] lg:text-[7.5rem] xl:text-[9rem] tracking-tighter text-white opacity-[0.07] leading-none block uppercase">
                  REPROFORGE
                </span>
              </div>
            </div>

            {/* Right Form Card Panel (~45%) */}
            <div className="w-full lg:col-span-5 flex flex-col items-center justify-center">
              <div className="w-full max-w-[460px]">
                <Outlet />
              </div>

              {/* Footer copyright line below card */}
              <div className="mt-6 text-center text-xs text-gray-500/80 font-mono">
                &copy; {currentYear} ReproForge
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * FormError banner for non-field request errors.
 */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 leading-relaxed"
    >
      <span className="font-bold text-rose-400 shrink-0 select-none">!</span>
      <span>{message}</span>
    </div>
  );
}
