import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/api-client";
import type { ErrorCode } from "@/contracts";
import { shouldRetry } from "@/lib/query-client";

const apiError = (code: ErrorCode) => new ApiError(code, "message", "req_test");

describe("shouldRetry", () => {
  it.each<ErrorCode>([
    "VALIDATION_ERROR",
    "INSUFFICIENT_CREDITS",
    "RUN_ALREADY_ACTIVE",
    "NOT_FOUND",
    "UNAUTHENTICATED",
    "FORBIDDEN",
    "WAITPOINT_EXPIRED",
  ])("never retries %s, which answers the same way every time", (code) => {
    expect(shouldRetry(1, apiError(code))).toBe(false);
  });

  it("retries INTERNAL, which may be transient", () => {
    expect(shouldRetry(1, apiError("INTERNAL"))).toBe(true);
  });

  it("retries RATE_LIMITED so the backoff can clear the window", () => {
    expect(shouldRetry(1, apiError("RATE_LIMITED"))).toBe(true);
  });

  it("stops a retryable error at three attempts", () => {
    const error = apiError("INTERNAL");

    expect(shouldRetry(1, error)).toBe(true);
    expect(shouldRetry(2, error)).toBe(true);
    expect(shouldRetry(3, error)).toBe(false);
  });

  it("retries a transport failure, which is what retries are for", () => {
    expect(shouldRetry(1, new TypeError("fetch failed"))).toBe(true);
  });

  it("does not retry contract drift, because the shape will not change", () => {
    const parsed = z.object({ ok: z.boolean() }).safeParse({ ok: "yes" });

    expect(parsed.success).toBe(false);
    expect(shouldRetry(1, parsed.error)).toBe(false);
  });
});
