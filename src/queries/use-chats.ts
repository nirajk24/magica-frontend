"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ChatDTO } from "@/contracts";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";

export type ChatsFilter = "all" | "pinned";

/**
 * The chat list, cursor-paginated.
 *
 * Search and filter are server-side because the brief requires search over message content, which
 * this side cannot do — filtering the loaded page here would silently only search what has already
 * been fetched.
 */
export function useChats({
  search,
  filter = "all",
}: { search?: string; filter?: ChatsFilter } = {}) {
  const api = useApi();
  const trimmed = search?.trim() || undefined;

  return useInfiniteQuery({
    queryKey: qk.chatList(filter, trimmed),
    queryFn: ({ pageParam }) => api.getChats({ cursor: pageParam, search: trimmed, filter }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * The chat list flattened, newest activity first.
 *
 * The reference reorders live — sending to a chat lifts it to the top — so rows are sorted by
 * `updatedAt` here rather than trusting page order, which is fixed at the moment each page was read.
 */
export function useChatList(options: { search?: string; filter?: ChatsFilter } = {}): {
  query: ReturnType<typeof useChats>;
  chats: ChatDTO[];
} {
  const query = useChats(options);
  const pages = query.data?.pages;

  const chats = useMemo(() => {
    const flat = (pages ?? []).flatMap((page) => page.chats);

    return [...flat].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [pages]);

  return { query, chats };
}
