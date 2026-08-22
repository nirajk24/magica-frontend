"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { describeFailure } from "@/lib/failure";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";

/**
 * Stops the run this chat is executing.
 *
 * Takes our own `AgentRun.id`, never Trigger.dev's `triggerRunId` — the two are not interchangeable
 * and only the former resolves a cancel.
 *
 * There is no `"cancelled"` status to wait for: `GET /chats/:id/active-run` filters on
 * `queued | running | waiting`, so a cancelled run makes that route answer `null`. Both queries are
 * invalidated so the screen learns that as soon as the server has written it.
 */
export function useCancelRun(chatId: string) {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (runId: string) => api.cancelRun(runId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
      await queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });
    },

    onError: (error) => pushToast(describeFailure(error, "That run couldn't be stopped.")),
  });
}

/**
 * The composer's stop control, and the window it has to stay red through.
 *
 * `settled` is the caller's answer to "has the stopped turn arrived?" — the active run gone *and*
 * the chat read back. Between the click and that moment the run is no longer active but the
 * cancelled row is not on screen yet, and without `stoppingRuns` holding the state the control would
 * flip to a send arrow and back again.
 */
export function useStopRun(chatId: string, runId: string | null, settled: boolean) {
  const cancel = useCancelRun(chatId);
  const stoppingRuns = useUI((state) => state.stoppingRuns);
  const markStopping = useUI((state) => state.markStopping);
  const clearStopping = useUI((state) => state.clearStopping);
  const [stoppedRunId, setStoppedRunId] = useState<string | null>(null);

  useEffect(() => {
    if (!stoppedRunId || !settled) return;

    clearStopping(stoppedRunId);
  }, [stoppedRunId, settled, clearStopping]);

  return {
    stopping: stoppedRunId !== null && stoppingRuns.includes(stoppedRunId),
    stop: () => {
      if (!runId) return;

      setStoppedRunId(runId);
      markStopping(runId);
      cancel.mutate(runId);
    },
  };
}
