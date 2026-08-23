"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ChatDTO, MessageDTO } from "@/contracts";
import { qk } from "@/lib/query-client";
import { flattenMessagePages, selectTranscript } from "@/lib/transcript";
import { useApi } from "@/lib/use-api";

/**
 * The chat id the send route treats as "create one for me". There is no `POST /chats`, so this is
 * how a conversation starts — and `GET /chats/new` would 404, which is why the query is disabled.
 */
export const NEW_CHAT_ID = "new";

/**
 * Message history, newest page first.
 *
 * Paginated rather than fetched whole because the PDF requires cursor-paginated message history with
 * no unbounded scans. Each page walks backwards in time, so `flattenMessagePages` reverses page
 * order before concatenating.
 */
export function useChat(chatId: string) {
  const api = useApi();

  return useInfiniteQuery({
    queryKey: qk.chat(chatId),
    queryFn: ({ pageParam }) => api.getChat(chatId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.messagesNextCursor ?? undefined,
    enabled: chatId !== NEW_CHAT_ID,
  });
}

/** The model a chat is configured with, or `undefined` for one the server has not created yet. */
export function useChatModel(chatId: string): string | undefined {
  return useChat(chatId).data?.pages[0]?.chat.modelId;
}

/**
 * The chat plus the rows the transcript should show. A row still being written belongs to the
 * streaming overlay, so it is filtered out here — see `selectTranscript` for what `liveOverlay`
 * must be passed, and why its default is the safe one.
 */
export function useChatTranscript(
  chatId: string,
  liveOverlay = true,
): {
  query: ReturnType<typeof useChat>;
  chat: ChatDTO | null;
  messages: MessageDTO[];
} {
  const query = useChat(chatId);
  const pages = query.data?.pages;

  const messages = useMemo(
    () => selectTranscript(flattenMessagePages(pages ?? []), { liveOverlay }),
    [pages, liveOverlay],
  );

  return { query, chat: pages?.[0]?.chat ?? null, messages };
}
