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

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    // The session lives in an httpOnly cookie, so the browser has to be
    // told to send it. Without this, every authenticated request goes out
    // without the cookie and comes back 401.
    credentials: "include",
    headers: {
      ...defaultHeaders,
      ...options.headers,
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
    throw new ApiError(
      data.message || `Request failed with status ${response.status}`,
      response.status,
      data.errors
    );
  }

  return data as ApiResponse<T>;
}
