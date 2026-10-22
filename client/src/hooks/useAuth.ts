import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "../lib/api";
import type { LoginFormData, SignupFormData } from "../lib/schemas";

/**
 * The public shape of a user. The server never sends `passwordHash` — it
 * does not even exist in this type.
 */
export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export const AUTH_QUERY_KEY = ["auth", "me"];

/**
 * The current user, or null when nobody is logged in.
 *
 * A 401 here is not an error: it is the normal answer for "no session".
 * The query therefore resolves to `null` instead of throwing, so callers
 * never have to distinguish "not logged in" from "the network broke".
 */
export function useMe() {
  return useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiFetch<AuthUser>("/api/auth/me");
        return res.data;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // Logged out. Not an error — just no user.
          return null;
        }
        throw err;
      }
    },
    // The session is the source of truth; do not keep asking for it.
    staleTime: 60 * 1000,
    retry: false,
  });
}

/**
 * Signs a user in.
 *
 * On success the whole query cache is cleared first. The cache may still
 * hold rows fetched by a previous user, and clearing it here is what stops
 * one account from seeing another account's data.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LoginFormData) => {
      const res = await apiFetch<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });
}

/**
 * Creates an account and signs the new user in.
 *
 * The cache is cleared for the same reason as in `useLogin`: the previous
 * session's data must not survive into the new account.
 */
export function useSignup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SignupFormData) => {
      const res = await apiFetch<AuthUser>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.data;
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });
}

/**
 * Ends the session.
 *
 * The cache is cleared even if the server call fails: the user asked to
 * log out, so the app must stop showing them their data either way.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch<null>("/api/auth/logout", { method: "POST" });
      return res.data;
    },
    onSettled: () => {
      queryClient.clear();
    },
  });
}
