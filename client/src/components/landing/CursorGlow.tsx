import { useEffect } from "react";
export function CursorGlow() {
  useEffect(() => {
    if (!window.matchMedia("(any-pointer: fine)").matches) return;

    const size = Math.round(Math.min(900, Math.max(480, window.innerWidth * 0.6)));    const rgb = "16,229,160";
    const el = document.createElement("div");
    el.setAttribute("data-cursor-glow", "");
    el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      width: `${size}px`,
      height: `${size}px`,
      marginLeft: `${-size / 2}px`,
      marginTop: `${-size / 2}px`,
      pointerEvents: "none",
      zIndex: "60",
      opacity: "0",
      transition: "opacity 200ms",
      willChange: "transform",
      background: `radial-gradient(closest-side,
        rgba(${rgb},0.22) 0%, rgba(${rgb},0.16) 18%, rgba(${rgb},0.09) 40%,
        rgba(${rgb},0.04) 65%, rgba(${rgb},0.01) 85%, rgba(${rgb},0) 100%)`,
    });
    document.body.appendChild(el);

    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      el.style.opacity = "1";
    };
    const hide = () => { el.style.opacity = "0"; };

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", hide);
      el.remove();
    };
  }, []);

  return null;
}