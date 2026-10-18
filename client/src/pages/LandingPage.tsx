import { Navbar } from "../components/landing/Navbar";
import { MotionConfig } from "framer-motion";
import { CursorGlow } from "../components/landing/CursorGlow";
import { AmbientBackground } from "../components/landing/AmbientBackground";
import { ProgressLine } from "../components/landing/ProgressLine";
import { Hero } from "../components/landing/Hero";
import { Footer } from "../components/landing/Footer";

export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-screen bg-[#05070D] text-gray-100 bg-grid-pattern relative selection:bg-emerald-500/30 selection:text-emerald-200">
      <ProgressLine />
      <AmbientBackground />
      <CursorGlow />
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </div>
    </MotionConfig>
  );
}
