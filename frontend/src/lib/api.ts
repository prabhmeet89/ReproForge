export interface FieldError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  errors?: FieldError[];
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly errors?: FieldError[];

  constructor(message: string, status: number = 400, errors?: FieldError[]) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Endpoints where a 401 is an expected answer rather than a broken session.
 *
 * `/api/auth/login` and `/api/auth/signup` return 401 when the credentials
 * are wrong, and `/api/auth/me` returns 401 when nobody is logged in. If
 * those triggered the unauthorized handler we would redirect to /login
 * while already sitting on /login — a redirect loop.
 */
const UNAUTHORIZED_EXEMPT_ENDPOINTS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/me",
];

/**
 * Called when a protected request comes back 401.
 *
 * It is registered once by the app so `apiFetch` — which is a plain
 * function, not a hook — can clear the cache and redirect. Registering it
 * in a module means there is exactly one place that decides what
 * "logged out" means for the whole app.
 */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

function isUnauthorizedExempt(endpoint: string) {
  return UNAUTHORIZED_EXEMPT_ENDPOINTS.some((exempt) =>
    endpoint.startsWith(exempt)
  );
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const defaultHeaders: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  const response = await fetch(url, {
    ...options,
    // The session lives in an httpOnly cookie, so the browser has to be
    // told to send it. Without this, every authenticated request goes out
    // without the cookie and comes back 401.
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string>),
    },
  });


  let data: any;
  try {
    data = await response.json();
  } catch (err) {
    throw new ApiError(
      `Failed to parse server response (${response.statusText})`,
      response.status
    );
  }

  if (!response.ok || data.success === false) {
    // The session is gone or was never there. Drop the cached data for
    // whoever was logged in and send the user to the login page.
    if (response.status === 401 && !isUnauthorizedExempt(endpoint)) {
      unauthorizedHandler?.();
    }

    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data.errors
    );
  }

  return data as ApiResponse<T>;
}
