import { useRef } from "react";

/**
 * SpotlightCard — reusable wrapper. Pointer move inside card writes
 * --mx/--my (relative) to card's ref.style. No React state.
 */
export function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMove = (e: React.PointerEvent) => {
    const r = cardRef.current;
    if (!r) return;
    const rect = r.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 100;
    const my = ((e.clientY - rect.top) / rect.height) * 100;
    r.style.setProperty("--mx", `${mx}%`);
    r.style.setProperty("--my", `${my}%`);
  };
  const handleLeave = () => {
    const r = cardRef.current;
    if (r) { r.style.setProperty("--mx", "50%"); r.style.setProperty("--my", "50%"); }
  };
  return (
    <div
      ref={cardRef}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`relative overflow-hidden ${className}`}
      style={{
        backgroundImage: "radial-gradient(circle 260px at var(--mx,50%) var(--my,50%), rgba(16,229,160,0.08), transparent 70%)",
      }}
    >
      {children}
    </div>
  );
}
