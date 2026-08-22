"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { NEW_CHAT_ID } from "@/queries/use-chat";

/**
 * The run this chat is currently executing, or `null`.
 *
 * INVARIANT: `staleTime: Infinity`. Every call mints a fresh realtime token, so a finite stale time
 * changes the token on a timer, and each change tears down and rebuilds the subscription against a
 * free-tier cap of ten concurrent connections. It is refetched deliberately — on send, on a run going
 * terminal, and on the token-refresh timer — and never on its own.
 *
 * The one exception is a run whose `triggerRunId` is still null, which is the moment between the send
 * route answering and dispatch landing. There is nothing to subscribe to yet, so this polls until
 * there is; without it a fast send would never attach to its own run.
 */
export function useActiveRun(chatId: string) {
  const api = useApi();

  return useQuery({
    queryKey: qk.activeRun(chatId),
    queryFn: () => api.getActiveRun(chatId),
    enabled: chatId !== NEW_CHAT_ID,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchInterval: (query) =>
      query.state.data && query.state.data.triggerRunId === null ? 1_000 : false,
  });
}
