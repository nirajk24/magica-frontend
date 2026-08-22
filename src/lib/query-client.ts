import { QueryClient } from "@tanstack/react-query";

/**
 * One factory, so `qk.chat(id)` is the same key in every file. Hand-written key arrays
 * scattered across components is how invalidation silently stops working.
 */
export const qk = {
  health: () => ["health"] as const,
  chats: (filter: "all" | "pinned" = "all") => ["chats", filter] as const,
  chat: (id: string) => ["chat", id] as const,
  activeRun: (chatId: string) => ["active-run", chatId] as const,
  credits: () => ["credits"] as const,
};

/**
 * `refetchOnWindowFocus` is off deliberately: alt-tabbing back mid-stream would refetch the
 * chat and fight the streaming overlay for the same rows.
 *
 * Note for the run-recovery query added in Phase 1 — `qk.activeRun` must override this with
 * `staleTime: Infinity`. It mints a fresh realtime token on every call, so any finite stale
 * time changes the token, which tears down and rebuilds the subscription against a free-tier
 * cap of 10 concurrent connections.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 3,
        refetchOnWindowFocus: false,
      },
    },
  });
}
