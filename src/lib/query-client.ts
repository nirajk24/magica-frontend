import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { ErrorCode } from "@/contracts";
import { ApiError } from "@/lib/api-client";

/** One factory, so `qk.chat(id)` is the same key everywhere. Hand-written arrays desync. */
export const qk = {
  health: () => ["health"] as const,
  chats: () => ["chats"] as const,
  chatList: (filter: "all" | "pinned" = "all", search?: string) =>
    ["chats", filter, search ?? null] as const,
  chat: (id: string) => ["chat", id] as const,
  activeRun: (chatId: string) => ["active-run", chatId] as const,
  credits: () => ["credits"] as const,
};

const MAX_ATTEMPTS = 3;

/** The only codes where the same request can plausibly succeed on a second try. */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>(["INTERNAL", "RATE_LIMITED"]);

/**
 * Whether a failed query is worth repeating.
 *
 * A 400, 402 or 409 will answer identically every time, so retrying it three times only delays
 * the message the user needs to see. A `ZodError` means the backend's shape drifted from the
 * contract, which a retry cannot fix either. Anything unrecognised is treated as transport —
 * a dropped connection is exactly what retries are for.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_ATTEMPTS) return false;
  if (error instanceof ApiError) return RETRYABLE.has(error.code);
  if (error instanceof z.ZodError) return false;

  return true;
}

/**
 * `refetchOnWindowFocus` is off because alt-tabbing back mid-stream would refetch the chat and
 * fight the streaming overlay for the same rows.
 *
 * INVARIANT: `qk.activeRun` must override `staleTime` with `Infinity`. It mints a fresh realtime
 * token per call, so any finite stale time rebuilds the subscription against a 10-connection cap.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  });
}
