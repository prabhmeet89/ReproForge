import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * AmbientBackground — one reusable layer behind all landing sections.
 *
 * - Faint hexagon-grid fills the page, visible only in the central
 *   region (where the glows are); it fades to transparent at the
 *   edges thanks to a radial mask. See --hex-grid-opacity token.
 * - Two slow-drifting radial glows: teal/emerald top-right (25s loop)
 *   and violet bottom-left (28s loop). Only transform is animated,
 *   never opacity — no scroll lag.
 * - Every colour reads from :root CSS variables so the whole palette
 *   can be swapped in one place. (See index.css :root block.)
 *
 * No layout shift, no images, no external deps.
 */
export function AmbientBackground() {
  const shouldReduce = useReducedMotion();
  const mx = useMotionValue(window.innerWidth / 2);
  const my = useMotionValue(window.innerHeight / 2);
  const springX = useSpring(mx, { stiffness: 999, damping: 60, mass: 0.3, restDelta: 0.001 });
  const springY = useSpring(my, { stiffness: 999, damping: 60, mass: 0.3, restDelta: 0.001 });
  const [firstMove, setFirstMove] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shouldReduce) return;
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      if (!firstMove) setFirstMove(true);
    };
    const onLeave = () => { mx.set(window.innerWidth / 2); my.set(window.innerHeight / 2); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("mouseleave", onLeave); };
  }, [shouldReduce, mx, my]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-gray-950">
      {/* Hidden SVG def holding the hex pattern once per render */}
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <pattern
            id="reproforge-hex-grid"
            x="0"
            y="0"
            width="32"
            height="32"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 32 0 L 64 16 L 32 32 L 0 16 Z"
              fill="#ffffff"
              fillOpacity="0.05"
            />
          </pattern>
        </defs>
      </svg>

      {/* Hexagon grid — masked by a radial ellipse so it is clear
          near the glows and fades out toward the screen edges. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(#reproforge-hex-grid)",
          backgroundSize: "32px 32px",
          backgroundRepeat: "repeat",
          opacity: "var(--hex-grid-opacity)",
          maskImage:
            "radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%)",
        }}
      />

      {/* Cursor-following teal glow (same element, moved from decorative loop) */}
      <motion.div
        ref={containerRef}
        className="fixed pointer-events-none aria-hidden rounded-full"
        style={{
          width: 380,
          height: 380,
          top: "50%",
          left: "50%",
          marginTop: -190,
          marginLeft: -190,
          background: "radial-gradient(circle at 50% 50%, rgba(16,229,160,0.22) 0%, rgba(34,211,238,0.10) 60%, transparent 100%)",
          x: shouldReduce ? 0 : springX,
          y: shouldReduce ? 0 : springY,
          translateZ: 0,
          willChange: "transform",
          opacity: firstMove ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Bottom-left glow: violet, slower drift, lighter blur */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-[520px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--glow-violet) 0%, transparent 70%)",
          opacity: "var(--glow-violet-opacity)",
          filter: "blur(95px)",
        }}
        initial={{ x: 0, y: 0 }}
        animate={shouldReduce ? { x: 0, y: 0 } : { x: [40, -30, 40, -30], y: [25, -30, 25, -30] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
