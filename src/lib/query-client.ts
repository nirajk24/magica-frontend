import { QueryClient } from "@tanstack/react-query";

/** One factory, so `qk.chat(id)` is the same key everywhere. Hand-written arrays desync. */
export const qk = {
  health: () => ["health"] as const,
  chats: (filter: "all" | "pinned" = "all") => ["chats", filter] as const,
  chat: (id: string) => ["chat", id] as const,
  activeRun: (chatId: string) => ["active-run", chatId] as const,
  credits: () => ["credits"] as const,
};

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
        retry: 3,
        refetchOnWindowFocus: false,
      },
    },
  });
}
