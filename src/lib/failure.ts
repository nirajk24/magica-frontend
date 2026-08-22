import { ApiError } from "@/lib/api-client";

export type Failure = { text: string; traceId: string | null };

/**
 * User-safe copy for an action that failed, plus the `traceId` to render beside it.
 *
 * `fallback` covers the case the caller understands better than this function does — what the user
 * was trying to do — and is used whenever the server's own message would be less useful than that.
 * A request that never reached the server has no trace to show.
 */
export function describeFailure(error: unknown, fallback: string): Failure {
  if (!(error instanceof ApiError)) {
    return { text: `${fallback} Check your connection and try again.`, traceId: null };
  }

  switch (error.code) {
    case "VALIDATION_ERROR":
    case "RATE_LIMITED":
    case "NOT_FOUND":
    case "FORBIDDEN":
    case "RUN_ALREADY_ACTIVE":
    case "INSUFFICIENT_CREDITS":
    case "WAITPOINT_EXPIRED":
      return { text: error.message, traceId: null };
    default:
      return { text: error.message, traceId: error.traceId };
  }
}
