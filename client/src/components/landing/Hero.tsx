import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import { Button } from "../ui/Button";
import { GithubIcon } from "../ui/GithubIcon";
import { VerdictDiagram } from "./VerdictDiagram";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background radial glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-violet-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center space-y-8 relative z-10">
        {/* Top Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium tracking-wide shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Autonomous Bug Reproduction Engine</span>
          <span className="w-1 h-1 rounded-full bg-emerald-400" />
          <span className="font-mono text-[11px] text-emerald-300">Phase 1 Preview</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.08] max-w-4xl mx-auto">
          Turn vague bug reports into{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            executable test proofs.
          </span>
        </h1>

        {/* Hero Description */}
        <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-sans">
          ReproForge ingests bug descriptions and repository context, synthesizes minimal
          reproduction scripts with LLMs, and verifies them inside isolated Docker sandboxes.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link to="/app">
            <Button size="lg" variant="primary" className="gap-2 text-sm shadow-xl shadow-emerald-500/20">
              <span>Open Developer Console</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <a
            href="https://github.com/prabhmeet89/ReproForge"
            target="_blank"
            rel="noreferrer"
          >
            <Button size="lg" variant="secondary" className="gap-2 text-sm">
              <GithubIcon className="w-4 h-4" />
              <span>View Source on GitHub</span>
            </Button>
          </a>
        </div>

        {/* Status Line */}
        <div className="pt-3 flex items-center justify-center gap-6 text-xs font-mono text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Zero host pollution</span>
          </div>
          <span className="text-gray-700">•</span>
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
            <span>Node/Express Sandbox ready</span>
          </div>
          <span className="text-gray-700">•</span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">100%</span>
            <span>Deterministic exit codes</span>
          </div>
        </div>

        {/* Interactive Hub-and-Spoke Verdict Diagram */}
        <div className="pt-10">
          <VerdictDiagram />
        </div>
      </div>
    </section>
  );
}
