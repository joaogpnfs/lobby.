// Response envelope used by every /api/v1 endpoint.
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export type PageMeta = { page: number; pageSize: number; total: number };

export type ApiSuccess<T> = { success: true; data: T; meta?: PageMeta };

export type ApiError = {
  success: false;
  error: { code: ErrorCode | (string & {}); message: string; details?: unknown };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type HealthStatus = { status: "ok" | "degraded"; db: "ok" | "down"; redis: "ok" | "down" };
