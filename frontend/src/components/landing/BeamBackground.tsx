import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import "./beam.css";

// Seeded dust motes relative to beam centerline
const DESKTOP_MOTES = [
  { id: 1, dx: -24, top: 12, size: 2.2, dur: 4.8, delay: 0.2 },
  { id: 2, dx: 18, top: 22, size: 1.8, dur: 5.5, delay: 1.1 },
  { id: 3, dx: -45, top: 31, size: 2.5, dur: 6.2, delay: 0.5 },
  { id: 4, dx: 36, top: 40, size: 1.5, dur: 4.9, delay: 2.3 },
  { id: 5, dx: -12, top: 48, size: 2.0, dur: 5.8, delay: 1.7 },
  { id: 6, dx: 42, top: 56, size: 1.7, dur: 6.0, delay: 0.8 },
  { id: 7, dx: -38, top: 63, size: 2.4, dur: 5.2, delay: 2.1 },
  { id: 8, dx: 15, top: 71, size: 1.6, dur: 4.7, delay: 1.4 },
  { id: 9, dx: -28, top: 78, size: 2.1, dur: 5.4, delay: 0.9 },
  { id: 10, dx: 26, top: 85, size: 1.9, dur: 6.4, delay: 2.8 },
  { id: 11, dx: -52, top: 18, size: 1.4, dur: 5.1, delay: 1.9 },
  { id: 12, dx: 50, top: 35, size: 2.2, dur: 5.7, delay: 0.4 },
  { id: 13, dx: -8, top: 67, size: 1.6, dur: 4.6, delay: 2.6 },
  { id: 14, dx: 30, top: 82, size: 2.0, dur: 5.9, delay: 1.2 },
];

const MOBILE_MOTES = DESKTOP_MOTES.slice(0, 6);

// Falling streaks parameters
const DESKTOP_STREAKS = [
  { id: 1, height: 110, dur: 3.2, delay: 0.4, dx: -1 },
  { id: 2, height: 140, dur: 2.6, delay: 1.8, dx: 1 },
  { id: 3, height: 95, dur: 4.2, delay: 0.9, dx: 0 },
  { id: 4, height: 160, dur: 2.8, delay: 2.7, dx: 2 },
  { id: 5, height: 120, dur: 3.8, delay: 1.5, dx: -2 },
];

const MOBILE_STREAKS = DESKTOP_STREAKS.slice(0, 2);

// Sparks emerging at the impact zone
const DESKTOP_SPARKS = [
  { id: 1, tx: -36, dur: 2.4, delay: 0.2 },
  { id: 2, tx: 42, dur: 3.1, delay: 1.1 },
  { id: 3, tx: -22, dur: 2.8, delay: 2.0 },
  { id: 4, tx: 30, dur: 3.5, delay: 0.8 },
  { id: 5, tx: -50, dur: 2.2, delay: 1.6 },
  { id: 6, tx: 20, dur: 3.9, delay: 2.5 },
];

const MOBILE_SPARKS = DESKTOP_SPARKS.slice(0, 3);

export interface BeamBackgroundProps {
  heroRef?: React.RefObject<HTMLElement | null>;
}

export function BeamBackground({ heroRef }: BeamBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Responsive layout switcher
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);

    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Pause off-screen via IntersectionObserver and tab visibility
  useEffect(() => {
    const target = heroRef?.current || containerRef.current;
    if (!target) return;

    let isIntersecting = true;
    let isVisible = !document.hidden;

    const updatePausedState = () => {
      setIsPaused(!isIntersecting || !isVisible);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          isIntersecting = entry.isIntersecting;
          updatePausedState();
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(target);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
      updatePausedState();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [heroRef]);

  const motes = useMemo(() => (isMobile ? MOBILE_MOTES : DESKTOP_MOTES), [isMobile]);
  const streaks = useMemo(() => (isMobile ? MOBILE_STREAKS : DESKTOP_STREAKS), [isMobile]);
  const sparks = useMemo(() => (isMobile ? MOBILE_SPARKS : DESKTOP_SPARKS), [isMobile]);

  // Positioning coordinates
  // Desktop: 50% (clean gutter between left column and right verdict diagram card)
  // Mobile: 90% (right edge, subtle accent, zero headline crossing)
  const beamX = isMobile ? "90%" : "50%";
  const opacityFactor = isMobile ? 0.6 : 1;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="beam-background"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${
        isPaused ? "beam-paused" : ""
      }`}
      style={{
        zIndex: 1,
        opacity: opacityFactor,
      }}
    >
      <div
        className="absolute inset-0"
        style={
          {
            "--beam-x": beamX,
            "--beam-rgb": "16, 229, 160",
            "--beam-cyan": "34, 211, 238",
          } as React.CSSProperties
        }
      >
        {/* Layer 1: Source Glow (elliptical radial gradient at top edge) */}
        <div
          data-testid="beam-source-glow"
          className="absolute -top-12 -translate-x-1/2 w-[360px] h-[150px] rounded-full pointer-events-none will-change-transform"
          style={{
            left: "var(--beam-x)",
            background: `radial-gradient(ellipse closest-side, rgba(var(--beam-rgb), 0.55) 0%, rgba(var(--beam-cyan), 0.25) 45%, transparent 100%)`,
            animation: shouldReduceMotion ? "none" : "beamBreathe 5s ease-in-out infinite",
          }}
        />

        {/* Layer 2: Halo (wide vertical band fading toward the lower part) */}
        <div
          data-testid="beam-halo"
          className="absolute top-0 bottom-12 -translate-x-1/2 w-[220px] pointer-events-none will-change-transform"
          style={{
            left: "var(--beam-x)",
            background: `linear-gradient(to right, transparent 0%, rgba(var(--beam-rgb), 0.14) 50%, transparent 100%)`,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.85) 60%, rgba(0,0,0,0) 100%)",
            animation: shouldReduceMotion ? "none" : "beamHaloBreathe 6.5s ease-in-out infinite",
          }}
        />

        {/* Layer 3: Core (3px line fading at ~88% + offset 6px line) */}
        <div
          data-testid="beam-core"
          className="absolute top-0 bottom-16 -translate-x-1/2 w-[12px] pointer-events-none will-change-transform"
          style={{
            left: "var(--beam-x)",
            animation: shouldReduceMotion ? "none" : "beamCoreFlicker 3.7s ease-in-out infinite",
          }}
        >
          {/* Main 3px core line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-[3px]"
            style={{
              background: `linear-gradient(to bottom, #ffffff 0%, rgba(var(--beam-rgb), 0.95) 15%, rgba(var(--beam-cyan), 0.7) 60%, transparent 88%)`,
              boxShadow: "0 0 10px rgba(var(--beam-rgb), 0.6)",
            }}
          />
          {/* Second faint 1px offset line for depth */}
          <div
            className="absolute left-[calc(50%+6px)] top-0 bottom-12 w-[1px] opacity-40"
            style={{
              background: `linear-gradient(to bottom, rgba(var(--beam-rgb), 0.8) 0%, rgba(var(--beam-cyan), 0.3) 50%, transparent 80%)`,
            }}
          />
        </div>

        {/* Dynamic Motion Layers (Disabled under prefers-reduced-motion) */}
        {!shouldReduceMotion && (
          <>
            {/* Layer 4: Falling Streaks */}
            <div data-testid="beam-streaks" className="absolute inset-0 pointer-events-none">
              {streaks.map((s) => (
                <div
                  key={s.id}
                  data-testid="beam-streak-item"
                  className="absolute top-0 -translate-x-1/2 w-[2px] will-change-transform pointer-events-none"
                  style={{
                    left: `calc(var(--beam-x) + ${s.dx}px)`,
                    height: `${s.height}px`,
                    background: `linear-gradient(to bottom, transparent 0%, #ffffff 50%, rgba(var(--beam-rgb), 0.9) 80%, transparent 100%)`,
                    animation: `beamStreakFall ${s.dur}s cubic-bezier(0.4, 0, 1, 1) infinite`,
                    animationDelay: `${s.delay}s`,
                  }}
                />
              ))}
            </div>

            {/* Layer 5: Dust Motes */}
            <div data-testid="beam-motes" className="absolute inset-0 pointer-events-none">
              {motes.map((m) => (
                <div
                  key={m.id}
                  data-testid="beam-mote-item"
                  className="absolute rounded-full pointer-events-none will-change-transform"
                  style={{
                    left: `calc(var(--beam-x) + ${m.dx}px)`,
                    top: `${m.top}%`,
                    width: `${m.size}px`,
                    height: `${m.size}px`,
                    background: "#ffffff",
                    boxShadow: `0 0 4px rgba(var(--beam-rgb), 0.8)`,
                    animation: `beamMoteDrift ${m.dur}s ease-in-out infinite`,
                    animationDelay: `${m.delay}s`,
                  }}
                />
              ))}
            </div>

            {/* Layer 6b: Impact Sparks */}
            <div data-testid="beam-sparks" className="absolute bottom-6 inset-x-0 pointer-events-none">
              {sparks.map((sp) => (
                <div
                  key={sp.id}
                  data-testid="beam-spark-item"
                  className="absolute bottom-0 -translate-x-1/2 w-[2px] h-[2px] rounded-full bg-white will-change-transform pointer-events-none"
                  style={
                    {
                      left: "var(--beam-x)",
                      "--spark-tx": `${sp.tx}px`,
                      boxShadow: "0 0 6px rgba(var(--beam-cyan), 0.9)",
                      animation: `beamSparkFly ${sp.dur}s cubic-bezier(0.2, 0.8, 0.2, 1) infinite`,
                      animationDelay: `${sp.delay}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </>
        )}

        {/* Layer 6a: Impact Zone (Floor glow ellipse & horizon line) */}
        <div
          data-testid="beam-floor-glow"
          className="absolute bottom-0 -translate-x-1/2 w-[560px] h-[80px] pointer-events-none will-change-transform"
          style={{
            left: "var(--beam-x)",
            background: `radial-gradient(ellipse closest-side, rgba(var(--beam-rgb), 0.35) 0%, rgba(var(--beam-cyan), 0.15) 50%, transparent 100%)`,
            animation: shouldReduceMotion ? "none" : "beamImpactPulse 3s ease-in-out infinite",
          }}
        >
          {/* 1px Horizon Line with gradient fade */}
          <div
            className="absolute bottom-3 inset-x-8 h-[1px]"
            style={{
              background: `linear-gradient(to right, transparent 0%, rgba(var(--beam-rgb), 0.7) 45%, #ffffff 50%, rgba(var(--beam-cyan), 0.7) 55%, transparent 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
