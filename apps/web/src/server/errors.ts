import "server-only";
import type { ApiError, ErrorCode } from "@apexlab/contracts";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400, NOT_FOUND: 404, TELEMETRY_UNAVAILABLE: 404,
  UNSUPPORTED_ARTIFACT_VERSION: 422, UPSTREAM_UNAVAILABLE: 503, INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  constructor(public code: ErrorCode, message: string) { super(message); }
  get status() { return STATUS[this.code]; }
}

export function errorBody(e: unknown): { body: ApiError; status: number } {
  if (e instanceof AppError) return { body: { error: { code: e.code, message: e.message } }, status: e.status };
  console.error("[apexlab] unexpected error", e); // log detail server-side only
  return { body: { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, status: 500 };
}
