import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Terminal, ArrowUpRight } from "lucide-react";
import { Button } from "../ui/Button";
import { GithubIcon } from "../ui/GithubIcon";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 z-50 flex justify-center px-4 transition-all duration-300 ${scrolled ? "top-2" : "top-4"}`}>
      <nav
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * 100;
          const y = ((e.clientY - r.top) / r.height) * 100;
          e.currentTarget.style.setProperty("--mx", `${x}%`);
          e.currentTarget.style.setProperty("--my", `${y}%`);
        }}
        className={`w-full max-w-5xl rounded-full border backdrop-blur-xl px-5 flex items-center justify-between transition-all duration-300 ${scrolled ? "bg-gray-950/95 border-gray-700/60 py-1.5 shadow-lg" : "bg-gray-950/80 border-gray-800/80 py-2.5 shadow-2xl"}`}
        style={{
          backgroundImage: "radial-gradient(circle 120px at var(--mx,50%) var(--my,50%), rgba(16,229,160,0.15), transparent 70%)",
        }}
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              ReproForge
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                v0.1
              </span>
            </span>
          </div>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-medium text-gray-400">
          <a href="#pipeline" className="hover:text-white transition-colors">
            Sandbox Pipeline
          </a>
          <a
            href="https://github.com/prabhmeet89/ReproForge"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition-colors flex items-center gap-1.5"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <Link to="/app">
            <Button size="sm" variant="primary" className="gap-1.5">
              <span>Launch App</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
