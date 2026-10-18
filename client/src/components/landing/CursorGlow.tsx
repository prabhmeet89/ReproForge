import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      el.style.opacity = "1";
    };
    const onLeave = () => { el.style.opacity = "0"; };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave, { passive: true });
    return () => { window.removeEventListener("pointermove", onMove); document.documentElement.removeEventListener("mouseleave", onLeave); };
  }, []);
  return createPortal(
    <div ref={ref} aria-hidden="true" style={{ position:"fixed", left:0, top:0, width:"380px", height:"380px", marginLeft:"-190px", marginTop:"-190px", zIndex:1, pointerEvents:"none", opacity:0, willChange:"transform", background:"radial-gradient(closest-side, rgba(16,229,160,0.26) 0%, rgba(16,229,160,0) 100%)", transition:"opacity 200ms ease" }} />,
    document.body
  );
}
