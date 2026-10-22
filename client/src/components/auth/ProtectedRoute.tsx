import { Navigate, useLocation } from "react-router-dom";
import { useMe } from "../../hooks/useAuth";
import { Skeleton } from "../ui/Skeleton";

/**
 * Guards a route that requires a session.
 *
 * While `/api/auth/me` is still in flight the route shows a skeleton
 * instead of redirecting — otherwise every refresh would bounce the user
 * to the login page for a fraction of a second, even with a perfectly
 * valid session.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) {
    return <ProtectedRouteSkeleton />;
  }

  if (!user) {
    // Send the user back where they were going once they log in.
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <>{children}</>;
}

/**
 * The reverse guard: a logged-in user has no business on the login or
 * signup pages, so they go to the console instead.
 */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isPending } = useMe();
  const location = useLocation();

  if (isPending) {
    return <ProtectedRouteSkeleton />;
  }

  if (user) {
    // Preserve the page the visitor originally asked for.
    const returnTo = new URLSearchParams(location.search).get("returnTo");
    const target = returnTo && returnTo.startsWith("/") ? returnTo : "/app";
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}

function ProtectedRouteSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
