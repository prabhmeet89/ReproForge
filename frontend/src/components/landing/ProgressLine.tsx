import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";

/**
 * ProgressLine — thin gradient line at very top tracking scroll progress.
 * Only transform (scaleX) animated — zero layout shift.
 */
export function ProgressLine() {
  const { scrollYProgress } = useScroll();
  const reduce = useReducedMotion();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] origin-left"
      style={{
        scaleX: reduce ? 0 : scaleX,
        background: "linear-gradient(90deg, var(--glow-teal) 0%, var(--glow-violet) 100%)",
      }}
    />
  );
}
