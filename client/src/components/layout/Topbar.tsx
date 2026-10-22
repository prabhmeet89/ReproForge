import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, LogOut } from "lucide-react";
import { Button } from "../ui/Button";
import { useMe, useLogout } from "../../hooks/useAuth";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user } = useMe();
  const logout = useLogout();

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

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      // The cache is cleared either way — see useLogout.
    }
    navigate("/login", { replace: true });
  };

  return (
    <header className="h-16 border-b border-gray-850 bg-gray-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h1 className="font-display font-bold text-base text-white tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <span
            title={user.email}
            className="hidden sm:block max-w-[220px] truncate text-xs text-gray-400 font-mono"
          >
            {user.email}
          </span>
        )}

        <Link to="/app/bug-reports/new">
          <Button size="sm" variant="primary" className="gap-1.5 shadow-md shadow-emerald-500/10">
            <Plus className="w-3.5 h-3.5" />
            <span>New Bug Report</span>
          </Button>
        </Link>

        {user && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            isLoading={logout.isPending}
            className="gap-1.5"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        )}
      </div>
    </header>
  );
}
