"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChatWithMessages } from "@/contracts";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";

type InfiniteChat = { pages: ChatWithMessages[]; pageParams: unknown[] };

/**
 * Like / dislike on one assistant message. Clicking the active thumb clears it (`type: null`), which
 * is the contract's own idiom for "took it back".
 *
 * The cached message is patched optimistically and rolled back on failure — feedback is the one
 * mutation where a refetch round-trip would make the control feel broken, because the thumb must
 * fill the instant it is pressed.
 */
export function useFeedback(chatId: string, messageId: string) {
  const api = useApi();
  const queryClient = useQueryClient();

  const patchCache = (feedback: "like" | "dislike" | null) => {
    queryClient.setQueryData<InfiniteChat>(qk.chat(chatId), (cached) =>
      cached
        ? {
            ...cached,
            pages: cached.pages.map((page) => ({
              ...page,
              messages: page.messages.map((message) =>
                message.id === messageId ? { ...message, feedback } : message,
              ),
            })),
          }
        : cached,
    );
  };

  return useMutation({
    mutationFn: (type: "like" | "dislike" | null) => api.setFeedback(messageId, { type }),

    onMutate: (type) => {
      const previous = queryClient.getQueryData<InfiniteChat>(qk.chat(chatId));
      patchCache(type);

      return { previous };
    },

    onError: (_error, _type, context) => {
      if (context?.previous) queryClient.setQueryData(qk.chat(chatId), context.previous);
    },
  });
}
