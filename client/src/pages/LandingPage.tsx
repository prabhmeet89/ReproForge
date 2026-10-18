import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { Footer } from "../components/landing/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 bg-grid-pattern relative selection:bg-emerald-500/30 selection:text-emerald-200">
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
