import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "../ui/Button";

export function Topbar() {
  const location = useLocation();

  const getPageTitle = (path: string) => {
    if (path === "/app") return "Dashboard";
    if (path.startsWith("/app/projects/new")) return "Create Project";
    if (path.startsWith("/app/projects")) return "Projects";
    if (path.startsWith("/app/bug-reports/new")) return "Submit Bug Report";
    if (path.includes("/investigation")) return "Investigation Hypothesis";
    if (path.startsWith("/app/bug-reports/")) return "Bug Report Details";
    if (path.startsWith("/app/bug-reports")) return "Bug Reports";
    if (path.startsWith("/app/test-runs/")) return "Test Execution Results";
    if (path.startsWith("/app/test-runs")) return "Test Runs";
    if (path.startsWith("/app/settings")) return "Settings";
    return "Developer Console";
  };

  const title = getPageTitle(location.pathname);

  return (
    <header className="h-16 border-b border-gray-850 bg-gray-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="font-display font-bold text-base text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link to="/app/bug-reports/new">
          <Button size="sm" variant="primary" className="gap-1.5 shadow-md shadow-emerald-500/10">
            <Plus className="w-3.5 h-3.5" />
            <span>New Bug Report</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
