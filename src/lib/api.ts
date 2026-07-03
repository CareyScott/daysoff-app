import type { User } from "@/lib/types";

// Fallback keeps fresh clones and CI Tauri builds working without env files.
const BASE_URL = import.meta.env.VITE_API_URL ?? "https://bv-vacation-api.vercel.app";
const STORAGE_KEY = "bv-vacation";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface StoredAuth {
  token: string;
  user: User;
}

export function getStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.token || !parsed?.user) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Attach bearer token + redirect on 401. Default true; login sets false. */
  auth?: boolean;
}

/**
 * Fetch wrapper for the BV Vacation API.
 * - Prefixes VITE_API_URL, sends/parses JSON.
 * - Attaches `Authorization: Bearer <token>` from localStorage.
 * - Throws ApiError(status, message) using the `{error}` body when present.
 * - On 401 for authenticated requests: clears stored auth and hard-redirects
 *   to /login (session expired / token revoked).
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const stored = getStoredAuth();
    if (stored) headers.Authorization = `Bearer ${stored.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }

  if (res.status === 401 && auth) {
    clearStoredAuth();
    window.location.href = "/login";
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body; keep fallback message
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
