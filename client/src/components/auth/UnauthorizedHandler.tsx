import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "../../lib/api";

/**
 * Teaches the API layer what to do when a protected request comes back 401.
 *
 * `apiFetch` is a plain function, so it cannot use hooks itself. This
 * component lives inside the QueryClientProvider and the Router, so it can
 * hold on to both the cache and the navigation, and hand them to
 * `apiFetch` through a single registered callback.
 *
 * Mounting it once, at the top of the app, means there is exactly one
 * place that decides what "the session expired" means.
 */
export function UnauthorizedHandler() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      // Drop everything cached for the user whose session just ended.
      queryClient.clear();

      // Remember where they were so login can send them back.
      const returnTo = `${location.pathname}${location.search}`;

      if (!location.pathname.startsWith("/login") && !location.pathname.startsWith("/signup")) {
        navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true });
      }
    });

    return () => setUnauthorizedHandler(null);
  }, [queryClient, navigate, location.pathname, location.search]);

  return null;
}
