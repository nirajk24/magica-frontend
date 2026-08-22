"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ActiveRun, SendMessageResult } from "@/contracts";
import type { ComposerSubmit } from "@/components/chat/Composer";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";
import { NEW_CHAT_ID } from "@/queries/use-chat";

/**
 * Attaches the screen to a run that has just started, whether it came from a send or from a retry —
 * both routes answer with the same `SendMessageResult`.
 *
 * `qk.activeRun` is seeded from the response rather than refetched: every field is already in the
 * parsed result, and a refetch would mint a second realtime token against a ten-connection cap.
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
  await queryClient.invalidateQueries({ queryKey: qk.chat(result.chatId) });
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
 */
export function useSendMessage(chatId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const router = useRouter();
  const setDraft = useUI((state) => state.setDraft);
  const clearDraft = useUI((state) => state.clearDraft);

  return useMutation({
    mutationFn: ({ content, planMode }: ComposerSubmit) =>
      api.sendMessage(chatId, { content, planMode }),

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
