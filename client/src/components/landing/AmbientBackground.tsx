import { useEffect, useState } from "react";
import { useMotionValue, useReducedMotion } from "framer-motion";

export function AmbientBackground() {
  const shouldReduce = useReducedMotion();
  const mx = useMotionValue(1200);
  const my = useMotionValue(600);
  const [firstMove, setFirstMove] = useState(false);
  const [visible, setVisible] = useState(1);

  useEffect(() => {
    if (shouldReduce) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      if (!firstMove) setFirstMove(true);
      setVisible(1);
    };
    const onLeave = () => setVisible(0);
    const onEnter = () => { if (firstMove) setVisible(1); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
    window.addEventListener("mouseenter", onEnter, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseenter", onEnter);
    };
  }, [shouldReduce, mx, my, firstMove]);

  const trackX = mx.get();
  const trackY = my.get();

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
      <div
        className="fixed pointer-events-none aria-hidden"
        style={{
          position: "fixed",
          left: 0, top: 0,
          width: "var(--glow-size, 380px)",
          height: "var(--glow-size, 380px)",
          marginLeft: "calc(var(--glow-size, 380px) / -2)",
          marginTop: "calc(var(--glow-size, 380px) / -2)",
          background: "radial-gradient(closest-side, rgba(16,229,160,0.26) 0%, rgba(16,229,160,0.19) 18%, rgba(16,229,160,0.11) 40%, rgba(16,229,160,0.045) 65%, rgba(16,229,160,0.012) 85%, rgba(16,229,160,0) 100%)",
          transform: `translate3d(${firstMove ? (mx.get() || trackX) : 1200}px, ${firstMove ? (my.get() || trackY) : 600}px, 0)`,
          opacity: visible,
          willChange: "transform",
          zIndex: 15,
        }}
      />
      <div className="absolute bottom-[25%] right-[25%] w-[520px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, var(--glow-violet) 0%, transparent 70%)", opacity: "var(--glow-violet-opacity)", filter: "blur(95px)" }} />
    </div>
  );
}
