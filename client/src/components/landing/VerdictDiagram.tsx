import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bug, Sparkles, Box, CheckCircle2, Terminal } from "lucide-react";

interface NodeDetail {
  id: string;
  title: string;
  tag: string;
  desc: string;
  icon: any;
  color: string;
  x: number;
  y: number;
}

const NODES: NodeDetail[] = [
  {
    id: "input",
    title: "Bug Report Context",
    tag: "INPUT",
    desc: "Ingests issue text, call stack, and repository source files",
    icon: Bug,
    color: "#f59e0b", // Amber
    x: 80,
    y: 120,
  },
  {
    id: "llm",
    title: "AI Synthesis Core",
    tag: "HYPOTHESIS",
    desc: "Analyzes execution paths and isolates root cause hypothesis",
    icon: Sparkles,
    color: "#8b5cf6", // Violet
    x: 520,
    y: 120,
  },
  {
    id: "sandbox",
    title: "Docker Sandbox",
    tag: "ISOLATION",
    desc: "Spins up ephemeral container with zero host network access",
    icon: Box,
    color: "#3b82f6", // Blue
    x: 80,
    y: 360,
  },
  {
    id: "verdict",
    title: "Deterministic Repro",
    tag: "VERIFIED",
    desc: "Executable test reproduces the failure state with proof logs",
    icon: CheckCircle2,
    color: "#10b981", // Emerald
    x: 520,
    y: 360,
  },
];

export function VerdictDiagram() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Center hub coordinates
  const centerX = 300;
  const centerY = 240;

  return (
    <div className="relative w-full max-w-2xl mx-auto p-4 rounded-3xl border border-gray-800 bg-gray-950/80 backdrop-blur-xl shadow-2xl shadow-emerald-500/5">
      {/* Top terminal-style caption */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-3 mb-2 px-2 text-xs font-mono text-gray-500">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>reproforge://engine/pipeline-orchestrator</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>SANDBOX ACTIVE</span>
        </div>
      </div>

      <div className="relative aspect-[600/460] w-full">
        <svg viewBox="0 0 600 460" className="w-full h-full select-none overflow-visible">
          <defs>
            {/* Gradients for connecting vectors */}
            <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="lineGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Spokes: Dashed vector lines connecting spokes to the central hub */}
          {NODES.map((node) => {
            const isHovered = activeNode === node.id;
            return (
              <g key={`spoke-${node.id}`}>
                <line
                  x1={node.x}
                  y1={node.y}
                  x2={centerX}
                  y2={centerY}
                  stroke={isHovered ? node.color : "#374151"}
                  strokeWidth={isHovered ? "2.5" : "1.5"}
                  strokeDasharray="5,5"
                  className="transition-colors duration-300"
                />

                {/* Animated traveling signal pulse along the line */}
                {!shouldReduceMotion && (
                  <circle r="3.5" fill={node.color} filter="url(#glow)">
                    <animateMotion
                      path={`M ${node.x} ${node.y} L ${centerX} ${centerY}`}
                      dur="2.8s"
                      repeatCount="indefinite"
                      keyPoints="0;1"
                      keyTimes="0;1"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Central Verdict Hub */}
          <g transform={`translate(${centerX}, ${centerY})`} className="cursor-pointer">
            <circle
              r="48"
              fill="#030712"
              stroke="#10b981"
              strokeWidth="2"
              filter="url(#glow)"
              className="transition-all duration-300"
            />
            <circle r="40" fill="#064e3b" fillOpacity="0.3" />
            <text
              textAnchor="middle"
              y="-6"
              fill="#ffffff"
              fontSize="12"
              fontWeight="700"
              fontFamily="Space Grotesk, sans-serif"
            >
              VERDICT
            </text>
            <text
              textAnchor="middle"
              y="12"
              fill="#10b981"
              fontSize="10"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              ENGINE
            </text>
            <circle
              r="52"
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4,4"
              className={shouldReduceMotion ? "" : "animate-[spin_18s_linear_infinite]"}
            />
          </g>

          {/* Surrounding Nodes */}
          {NODES.map((node) => {
            const isHovered = activeNode === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
                className="cursor-pointer group"
              >
                {/* Node outer pulse ring on hover */}
                {isHovered && (
                  <circle
                    r="34"
                    fill="none"
                    stroke={node.color}
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                    className={shouldReduceMotion ? "" : "animate-spin"}
                  />
                )}

                {/* Node background circle */}
                <circle
                  r="28"
                  fill="#0b0f19"
                  stroke={isHovered ? node.color : "#1f2937"}
                  strokeWidth="2"
                  filter={isHovered ? "url(#glow)" : undefined}
                  className="transition-all duration-200"
                />

                {/* Center Icon */}
                <foreignObject x="-14" y="-14" width="28" height="28">
                  <div
                    className="w-full h-full flex items-center justify-center transition-colors"
                    style={{ color: node.color }}
                  >
                    <node.icon className="w-5 h-5" />
                  </div>
                </foreignObject>

                {/* Node Label Text */}
                <text
                  textAnchor="middle"
                  y="46"
                  fill={isHovered ? "#ffffff" : "#9ca3af"}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Space Grotesk, sans-serif"
                  className="transition-colors"
                >
                  {node.title}
                </text>
                <text
                  textAnchor="middle"
                  y="58"
                  fill={node.color}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                  letterSpacing="0.05em"
                >
                  {node.tag}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Detail Card on Hover */}
        {activeNode && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-2 inset-x-6 bg-gray-900/95 border border-gray-700/80 rounded-xl p-3 text-xs text-gray-300 backdrop-blur-md shadow-2xl flex items-center justify-between"
          >
            <div>
              <span className="font-semibold text-white mr-2">
                {NODES.find((n) => n.id === activeNode)?.title}:
              </span>
              <span>{NODES.find((n) => n.id === activeNode)?.desc}</span>
            </div>
            <span
              className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border ml-3 shrink-0"
              style={{
                color: NODES.find((n) => n.id === activeNode)?.color,
                borderColor: `${NODES.find((n) => n.id === activeNode)?.color}40`,
              }}
            >
              {NODES.find((n) => n.id === activeNode)?.tag}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
