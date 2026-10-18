import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const debug = typeof window !== "undefined" && window.location.search.includes("debugGlow=1");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // reduced motion: direct tracking, only remove opacity transition
      const el = ref.current;
      if (!el) return;
      const onMove = (e: MouseEvent) => {
        el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        el.style.opacity = "1";
      };
      const onLeave = () => { el.style.opacity = "0"; };
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeave, { passive: true });
      return () => {
        window.removeEventListener("pointermove", onMove);
        document.documentElement.removeEventListener("mouseleave", onLeave);
      };
    }

    // normal: any-pointer fine, follow 1:1, initial visible at 70%/35%
    if (!window.matchMedia("(any-pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    el.style.transform = `translate3d(${w * 0.7}px, ${h * 0.35}px, 0)`;
    el.style.opacity = "1";

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      el.style.opacity = "1";
      if (debug && (Math.round(e.clientX + e.clientY) % 20 === 0)) console.log("cursor", e.clientX, e.clientY);
    };
    const onLeave = () => { el.style.opacity = "0"; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const size = Math.round(Math.min(560, Math.max(280, typeof window !== "undefined" ? window.innerWidth * 0.42 : 380)));

  const glow = (
    <div
      ref={ref}
      data-cursor-glow
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0, top: 0,
        width: `${size}px`,
        height: `${size}px`,
        marginLeft: `${-size / 2}px`,
        marginTop: `${-size / 2}px`,
        zIndex: 0,
        willChange: "transform",
        opacity: 1,
        pointerEvents: "none",
        background: debug
          ? "radial-gradient(closest-side, magenta 0%, transparent 100%)"
          : "radial-gradient(closest-side, rgba(16,229,160,0.26) 0%, rgba(16,229,160,0.19) 18%, rgba(16,229,160,0.11) 40%, rgba(16,229,160,0.045) 65%, rgba(16,229,160,0.012) 85%, rgba(16,229,160,0) 100%)",
        transition: "opacity 200ms ease",
      }}
    />
  );

  return createPortal(glow, document.body);
}
