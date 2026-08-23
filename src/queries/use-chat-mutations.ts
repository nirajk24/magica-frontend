"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateChat } from "@/contracts";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";

/** Rename or pin one chat. The list refetches rather than being patched — order depends on it. */
export function useUpdateChat() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: ({ chatId, body }: { chatId: string; body: UpdateChat }) =>
      api.updateChat(chatId, body),

    onSuccess: async (_result, { chatId }) => {
      await queryClient.invalidateQueries({ queryKey: qk.chats() });
      await queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });
    },

    onError: (error) => toastMutationFailure(pushToast, error, "That change didn't save."),
  });
}

/**
 * Soft-deletes chats. The server also cancels a turn still running in a deleted chat, so this is
 * safe on a chat with an active run.
 */
export function useDeleteChats() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: async (chatIds: readonly string[]) => {
      for (const chatId of chatIds) await api.deleteChat(chatId);
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.chats() });
    },

    onError: (error) => toastMutationFailure(pushToast, error, "Some tasks weren't deleted."),
  });
}

function toastMutationFailure(
  pushToast: (toast: { text: string; traceId: string | null }) => void,
  error: unknown,
  fallback: string,
) {
  pushToast({
    text: error instanceof ApiError ? error.message : fallback,
    traceId: error instanceof ApiError ? error.traceId : null,
  });
}
