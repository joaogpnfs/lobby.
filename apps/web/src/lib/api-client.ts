import type { ApiResponse, ApiSuccess, AuthTokens, PageMeta } from "@lobby/types";

// Thrown for any { success: false } response, carrying the API's error code.
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// The access token lives only in memory (never localStorage): a reload starts with none and calls refresh,
// which works off the httpOnly cookie.
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// One refresh in flight at a time: parallel 401s all wait on the same call, so the
// rotating refresh token is never sent twice (the API would treat that as theft).
export function refreshSession(): Promise<boolean> {
  refreshing ??= request<AuthTokens>("/auth/refresh", { method: "POST" })
    .then(({ data: { accessToken } }) => {
      setAccessToken(accessToken);
      return true;
    })
    .catch(() => {
      setAccessToken(null);
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) throw new ApiError("INVALID_RESPONSE", `Unexpected response (${res.status})`, res.status);
  if (!body.success) throw new ApiError(body.error.code, body.error.message, res.status, body.error.details);
  return body;
}

// These answer 401 for bad credentials, not for an expired access token.
const SESSION_ROUTES = new Set(["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"]);

// The only place in the web app that calls fetch. Same-origin: Next rewrites /api/v1/* to the API.
// An expired access token is refreshed once and the request retried.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return (await withRefresh<T>(path, init)).data;
}

// Paginated lists: items plus { page, pageSize, total }.
export async function apiPage<T>(path: string): Promise<{ items: T[]; meta: PageMeta }> {
  const body = await withRefresh<T[]>(path);
  return { items: body.data, meta: body.meta! };
}

async function withRefresh<T>(path: string, init?: RequestInit) {
  try {
    return await request<T>(path, init);
  } catch (err) {
    const retry =
      err instanceof ApiError && err.status === 401 && !SESSION_ROUTES.has(path) && (await refreshSession());
    if (!retry) throw err;
    return request<T>(path, init);
  }
}
