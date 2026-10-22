import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Terminal } from "lucide-react";
import { Button } from "../ui/Button";
import { GithubIcon } from "../ui/GithubIcon";
import { VerdictDiagram } from "./VerdictDiagram";

export function Hero() {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left column — text stack (left-aligned) */}
          <div className="space-y-7 pt-2 lg:pr-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium tracking-wide shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Bug Reproduction Engine</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-emerald-300">Phase 1 Preview</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.9rem] font-display font-extrabold text-white tracking-tight leading-[1.08]">
              Turn vague bug reports into{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                executable test proofs.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-lg leading-relaxed font-sans">
              ReproForge ingests bug descriptions and repository context, synthesizes minimal reproduction scripts with LLMs, and verifies them inside isolated Docker sandboxes.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/app">
                <Button size="lg" variant="primary" className="gap-2 text-sm shadow-xl shadow-emerald-500/20">
                  <span>Open Developer Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="https://github.com/prabhmeet89/ReproForge" target="_blank" rel="noreferrer">
                <Button size="lg" variant="secondary" className="gap-2 text-sm">
                  <GithubIcon className="w-4 h-4" />
                  <span>View Source</span>
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs font-mono text-gray-500">
              <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span>Zero host pollution</span></div>
              <span className="text-gray-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-2"><Terminal className="w-3.5 h-3.5 text-gray-400" /><span>Sandbox ready</span></div>
              <span className="text-gray-700 hidden sm:inline">•</span>
              <div className="flex items-center gap-2"><span className="text-emerald-400 font-semibold">100%</span><span>Deterministic exit codes</span></div>
            </div>
          </div>

          {/* Right column — diagram (reuse, not rebuild) */}
          <div className="lg:pt-4">
            <VerdictDiagram />
          </div>
        </div>
      </div>
    </section>
  );
}
