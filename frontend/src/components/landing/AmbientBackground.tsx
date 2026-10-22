import { useEffect, useState } from "react";
import { useMotionValue, useReducedMotion } from "framer-motion";

export function AmbientBackground() {
  const shouldReduce = useReducedMotion();
  const mx = useMotionValue(1200);
  const my = useMotionValue(600);
  const [firstMove, setFirstMove] = useState(false);
  // visible removed

  useEffect(() => {
    if (shouldReduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      if (!firstMove) setFirstMove(true);
      //setVisible;
    };
    const onLeave = () => {};
    const onEnter = () => { if (firstMove) {} };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    window.addEventListener("mouseenter", onEnter, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
    };
  }, [shouldReduce, mx, my, firstMove]);

  // trackX removed
  // trackY removed

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#05070D]" style={{ zIndex: 10 }}>
      <svg width="0" height="0" aria-hidden="true">
        <defs>
          <pattern id="reproforge-hex-grid" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 64 16 L 32 32 L 0 16 Z" fill="#ffffff" fillOpacity="0.05" />
          </pattern>
        </defs>
      </svg>
      <div className="absolute inset-0" style={{
        backgroundImage: "url(#reproforge-hex-grid)", backgroundSize: "32px 32px", backgroundRepeat: "repeat",
        opacity: "var(--hex-grid-opacity)",
        maskImage: "radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%)",
        WebkitMaskImage: "radial-gradient(ellipse 78% 78% at center, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%)",
      }} />
      <div className="absolute bottom-[25%] right-[25%] w-[520px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, var(--glow-violet) 0%, transparent 70%)", opacity: "var(--glow-violet-opacity)", filter: "blur(95px)" }} />
    </div>
  );
}
