import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderGit2,
  Bug,
  Terminal,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";

const NAV_ITEMS = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/projects", label: "Projects", icon: FolderGit2 },
  { to: "/app/bug-reports", label: "Bug Reports", icon: Bug },
  { to: "/app/test-runs", label: "Test Runs", icon: Terminal },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col justify-between border-r border-gray-850 bg-gray-950 transition-all duration-300 z-40 shrink-0",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Top Header / Branding */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-850/80">
          <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <Terminal className="w-4 h-4" />
            </div>
            {!collapsed && (
              <span className="font-display font-bold text-sm text-white tracking-tight truncate">
                ReproForge
              </span>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-900 transition-colors cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900/60"
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom Footer Info */}
      <div className="p-3 border-t border-gray-850/80">
        {!collapsed ? (
          <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-850 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>SANDBOX</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ISOLATED
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-snug">
              In-memory engine running. Data resets on server restart.
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-2 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Engine Online" />
          </div>
        )}
      </div>
    </aside>
  );
}
