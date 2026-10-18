import { Terminal } from "lucide-react";
import { GithubIcon } from "../ui/GithubIcon";

export function Footer() {
  return (
    <footer className="border-t border-gray-900 bg-gray-950/60 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-gray-500 font-mono">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-gray-200">ReproForge</span>
          <span>— Autonomous Bug Reproduction Tool</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/prabhmeet89/ReproForge"
            target="_blank"
            rel="noreferrer"
            className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub Repository</span>
          </a>
          <span>Phase 1 Architecture</span>
        </div>
      </div>
    </footer>
  );
}
