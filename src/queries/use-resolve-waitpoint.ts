"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ResolveWaitpoint } from "@/contracts";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";

/**
 * Resolves one waitpoint and reattaches the screen to the run that wakes up.
 *
 * Resolving twice is a 200 no-op server-side, so a double click cannot corrupt anything — the
 * mutation fires without a client-side latch. `WAITPOINT_EXPIRED` (410) clears the overlay through
 * the same invalidation and says how to continue; retrying an expired token would loop forever.
 */
export function useResolveWaitpoint(chatId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: ({ waitpointId, body }: { waitpointId: string; body: ResolveWaitpoint }) =>
      api.resolveWaitpoint(waitpointId, body),

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
      await queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });
    },

    onError: (error) => {
      if (error instanceof ApiError && error.code === "WAITPOINT_EXPIRED") {
        pushToast({
          text: "This request expired while it waited. Send a message to continue.",
          traceId: null,
        });
        return;
      }

      pushToast({
        text: error instanceof ApiError ? error.message : "That didn't reach the server.",
        traceId: error instanceof ApiError ? error.traceId : null,
      });
    },
  });
}
