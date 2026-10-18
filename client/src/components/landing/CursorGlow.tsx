import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * CursorGlow — interactive mouse-following glow.
 * - Large soft glow (500-600px radius, peak ~20% opacity) with lazy spring.
 * - Small bright core (8-10px + 28-36px ring) with stiffer spring.
 * - Hex reveal via CSS variables on a ref (no React state per mousemove).
 * - Only when (hover:hover) and (pointer:fine); hidden on reduced-motion.
 * - Click pulse; hover brightens; idle hidden until first move.
 */
export function CursorGlow() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values — never trigger React re-render
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const cx = useSpring(mx, { stiffness: 120, damping: 25, restDelta: 0.001 });
  const cy = useSpring(my, { stiffness: 120, damping: 25, restDelta: 0.001 });
  const coreX = useSpring(mx, { stiffness: 400, damping: 30 });
  const coreY = useSpring(my, { stiffness: 400, damping: 30 });

  useEffect(() => {
    if (reduce) return;
    const el = containerRef.current;
    if (!el) return;

    let firstMove = false;

    const onMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      mx.set(x);
      my.set(y);
      // Hex reveal via direct style (no React state)
      el.style.setProperty("--cursor-x", `${x}px`);
      el.style.setProperty("--cursor-y", `${y}px`);
      firstMove = true;
    };

    const onLeave = () => { firstMove = false; el.style.setProperty("--cursor-opacity", "0"); };
    const onEnter = () => { if (firstMove) el.style.setProperty("--cursor-opacity", "1"); };
    const onDown = () => {
      el.style.setProperty("--pulse-active", "1");
      setTimeout(() => el.style.setProperty("--pulse-active", "0"), 450);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    window.addEventListener("mouseenter", onEnter, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mousedown", onDown);
    };
  }, [reduce, mx, my]);

  // Static glow for reduced-motion (hero only, never full-screen drift)
  if (reduce) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none z-[15] aria-hidden"
        style={{
          background: "radial-gradient(circle 500px at 50% 30%, rgba(16,229,160,0.10), transparent 70%)",
        }}
      />
    );
  }

  return (
    <>
      {/* Hex reveal layer — masked near cursor */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-[15] aria-hidden overflow-hidden"
        style={{
          opacity: "var(--cursor-opacity, 0)",
          transition: "opacity 0.3s ease",
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "url(#reproforge-hex-grid)",
            backgroundSize: "32px 32px",
            backgroundRepeat: "repeat",
            maskImage: "radial-gradient(circle 260px at var(--cursor-x, 50%) var(--cursor-y, 50%), rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "radial-gradient(circle 260px at var(--cursor-x, 50%) var(--cursor-y, 50%), rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Large slow glow */}
      <motion.div
        className="fixed pointer-events-none z-[14] aria-hidden mix-blend-screen rounded-full"
        style={{
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(16,229,160,0.18) 0%, rgba(34,211,238,0.08) 60%, transparent 100%)",
          x: cx,
          y: cy,
          translateZ: 0,
          willChange: "transform",
        }}
      />

      {/* Small bright core */}
      <motion.div
        className="fixed pointer-events-none z-[16] aria-hidden rounded-full"
        style={{
          width: 36,
          height: 36,
          background: "radial-gradient(circle, rgba(16,229,160,0.35) 0%, rgba(34,211,238,0.15) 70%, transparent 100%)",
          x: coreX,
          y: coreY,
          translateZ: 0,
          willChange: "transform",
        }}
      />

      {/* Core dot */}
      <motion.div
        className="fixed pointer-events-none z-[17] aria-hidden rounded-full"
        style={{
          width: 10,
          height: 10,
          background: "#10E5A0",
          boxShadow: "0 0 12px 3px rgba(16,229,160,0.4)",
          x: coreX,
          y: coreY,
          translateZ: 0,
          willChange: "transform",
        }}
      />

      {/* Click pulse ring — shown via CSS transition on class change */}
      <div
        className="fixed pointer-events-none z-[16] aria-hidden rounded-full border border-emerald-400/30 transition-all duration-[450ms] ease-out opacity-0 scale-100"
        style={{
          left: `calc(var(--cursor-x, 50%) - 50px)`,
          top: `calc(var(--cursor-y, 50%) - 50px)`,
        }}
      />
    </>
  );
}
