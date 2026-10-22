import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  showLineNumbers = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const lines = code.trim().split("\n");

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-800 bg-gray-950/90 overflow-hidden font-mono text-xs shadow-2xl",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-800/80 px-4 py-2.5 bg-gray-900/60">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          {filename && <span className="ml-2 font-mono text-xs text-gray-300">{filename}</span>}
        </div>
        <div className="flex items-center gap-3">
          {language && (
            <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
              {language}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code contents with line numbers */}
      <div className="p-4 overflow-x-auto text-gray-200 leading-relaxed max-h-[400px]">
        {lines.map((line, index) => (
          <div key={index} className="flex">
            {showLineNumbers && (
              <span className="w-8 shrink-0 select-none text-gray-600 text-right pr-4 text-[11px]">
                {index + 1}
              </span>
            )}
            <span className="whitespace-pre">{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
