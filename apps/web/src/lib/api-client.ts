import type { ApiResponse } from "@lobby/types";

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

// The only place in the web app that calls fetch. Same-origin: Next rewrites /api/v1/* to the API.
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) throw new ApiError("INVALID_RESPONSE", `Unexpected response (${res.status})`, res.status);
  if (!body.success) throw new ApiError(body.error.code, body.error.message, res.status, body.error.details);
  return body.data;
}
