"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { describeFailure } from "@/lib/failure";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";
import { applyRunStart } from "@/queries/use-send-message";

/**
 * Runs a failed or cancelled turn again, from the assistant message that ended it.
 *
 * `POST /messages/:id/retry` answers with the same `SendMessageResult` a send does, so this shares
 * the send path's success handling instead of repeating it — the screen attaches to the new run the
 * same way either way.
 */
export function useRetryMessage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (messageId: string) => api.retryMessage(messageId),

    onSuccess: (result) => applyRunStart(queryClient, result),

    onError: (error) => pushToast(describeFailure(error, "That turn couldn't be retried.")),
  });
}
