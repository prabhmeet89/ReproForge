import { Link } from "react-router-dom";
import { FolderSearch } from "lucide-react";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400">
        <FolderSearch className="w-7 h-7" />
      </div>
      <h2 className="text-2xl font-display font-bold text-white tracking-tight">404 - Page Not Found</h2>
      <p className="text-sm text-gray-400 max-w-sm">
        The route you are looking for does not exist in the ReproForge console.
      </p>
      <Link to="/app">
        <Button variant="primary" size="sm">
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
}
