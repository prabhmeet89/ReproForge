import { Link } from "react-router-dom";
import { Terminal, ArrowUpRight } from "lucide-react";
import { Button } from "../ui/Button";
import { GithubIcon } from "../ui/GithubIcon";

export function Navbar() {
  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
      <nav className="w-full max-w-5xl rounded-full border border-gray-800/80 bg-gray-950/80 backdrop-blur-xl px-5 py-2.5 shadow-2xl flex items-center justify-between">
        {/* Brand Logo */}
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
