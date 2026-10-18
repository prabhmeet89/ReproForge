import { motion, useReducedMotion } from "framer-motion";

/**
 * ScrollReveal — one reusable wrapper for landing sections.
 * Fades in + slides up ~24px when entering viewport, once only.
 * Children staggered 60-80ms. All under 300ms. Only opacity + y animated.
 * Framer Motion respects reduced-motion when wrapped with MotionConfig.
 * If prefers-reduced-motion is active, animations are disabled automatically.
 */
interface Props { children: React.ReactNode; className?: string; delay?: number; }
export function ScrollReveal({ children, className = "", delay = 0 }: Props) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? undefined : { opacity: 0, y: 24 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.28, delay: delay * 0.08, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
