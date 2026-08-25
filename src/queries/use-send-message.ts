"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ActiveRun, SendMessageResult } from "@/contracts";
import type { ComposerSubmit } from "@/components/chat/Composer";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";
import { selectedModel } from "@/lib/models";
import { NEW_CHAT_ID, useChatModel } from "@/queries/use-chat";

/**
 * Attaches the screen to a run that has just started, whether it came from a send or from a retry —
 * both routes answer with the same `SendMessageResult`.
 *
 * `qk.activeRun` is seeded from the response rather than refetched: every field is already in the
 * parsed result, and a refetch would mint a second realtime token against a ten-connection cap.
 *
 * The chat *list* is invalidated as well as the conversation: sending moves the chat's `updatedAt`,
 * and the reference lifts that row to the top of Recent tasks as it happens. `qk.chats()` is the
 * prefix every filtered and searched list shares, so one call covers them all.
 */
export async function applyRunStart(
  queryClient: QueryClient,
  result: SendMessageResult,
): Promise<void> {
  const activeRun: ActiveRun = {
    runId: result.runId,
    triggerRunId: result.triggerRunId,
    status: "queued",
    assistantMessageId: result.assistantMessageId,
    publicAccessToken: result.publicAccessToken,
    pendingWaitpoint: null,
  };

  queryClient.setQueryData(qk.activeRun(result.chatId), activeRun);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.chat(result.chatId) }),
    queryClient.invalidateQueries({ queryKey: qk.chats() }),
  ]);
}

/**
 * Sends a turn, and for `chatId === 'new'` moves the browser to the chat the server just created.
 *
 * The optimistic user bubble is held by the screen rather than written into `qk.chat`: an unsent
 * message is not server state, and a hand-built `MessageDTO` in a cache whose every other row was
 * parsed from a response is a lie waiting to be read as truth. The bubble clears once the
 * invalidation has actually refetched, so there is no flicker at handover.
 *
 * `qk.activeRun` is seeded from the response instead of refetched. Every field comes from the parsed
 * result, and refetching would mint a second realtime token against a 10-connection cap.
 *
 * INVARIANT: `modelId` is sent on every turn, never omitted. The server persists it to the chat each
 * time, and the field carries a default — so leaving it out does not mean "keep what the chat has",
 * it silently resets a chat back to the build default.
 */
export function useSendMessage(chatId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const router = useRouter();
  const setDraft = useUI((state) => state.setDraft);
  const clearDraft = useUI((state) => state.clearDraft);
  const pendingModel = useUI((state) => state.modelByChat[chatId]);
  const modelId = selectedModel(pendingModel, useChatModel(chatId));

  return useMutation({
    mutationFn: ({ content, planMode, attachmentIds }: ComposerSubmit) =>
      api.sendMessage(chatId, { content, planMode, modelId, attachmentIds }),

    onMutate: ({ content }: ComposerSubmit) => {
      clearDraft(chatId);
      return { content };
    },

    onSuccess: async (result) => {
      if (chatId === NEW_CHAT_ID) {
        queryClient.setQueryData(qk.activeRun(result.chatId), {
          runId: result.runId,
          triggerRunId: result.triggerRunId,
          status: "queued",
          assistantMessageId: result.assistantMessageId,
          publicAccessToken: result.publicAccessToken,
          pendingWaitpoint: null,
        } satisfies ActiveRun);

        await queryClient.prefetchInfiniteQuery({
          queryKey: qk.chat(result.chatId),
          queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
            api.getChat(result.chatId, pageParam),
          initialPageParam: undefined as string | undefined,
        });
        // The server created the chat, so Recent tasks has a row it has never seen.
        void queryClient.invalidateQueries({ queryKey: qk.chats() });

        // The caller has already adopted the created id, so this is only bringing the router's own
        // state along — without it Next still believes the screen is `/chat`, and `New task` links
        // there and does nothing. `[chatId]` has no loading boundary, so the current page stays on
        // screen through the segment fetch rather than blanking behind a fallback.
        router.replace(`/chat/${result.chatId}`);
        return;
      }

      await applyRunStart(queryClient, result);
    },

    onError: (error, _submission, context) => {
      if (context) setDraft(chatId, context.content);

      if (error instanceof ApiError && error.code === "RUN_ALREADY_ACTIVE") {
        void queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
      }
    },
  });
}

/**
 * Copy for a send that failed, or `null` for one the UI deliberately says nothing about.
 *
 * `RUN_ALREADY_ACTIVE` is swallowed: a run really is in progress, the screen already shows it, and
 * the draft has been put back.
 */
export function sendFailureMessage(
  error: unknown,
): { text: string; traceId: string | null } | null {
  if (!(error instanceof ApiError)) {
    return { text: "That didn't reach the server. Check your connection and try again.", traceId: null };
  }

  switch (error.code) {
    case "RUN_ALREADY_ACTIVE":
      return null;
    case "INSUFFICIENT_CREDITS":
      return { text: "You're out of credits, so this turn wasn't started.", traceId: null };
    case "VALIDATION_ERROR":
    case "RATE_LIMITED":
    case "NOT_FOUND":
    case "FORBIDDEN":
      return { text: error.message, traceId: null };
    default:
      return { text: error.message, traceId: error.traceId };
  }
}
