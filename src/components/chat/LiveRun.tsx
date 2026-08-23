"use client";

import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { RunMetadata, STREAM_AGENT_TEXT, type ActiveRun } from "@/contracts";
import { ConnectionPill } from "@/components/chat/ConnectionPill";
import { PendingTurn } from "@/components/chat/PendingTurn";
import { StreamingOverlay } from "@/components/chat/StreamingOverlay";
import { qk } from "@/lib/query-client";

const TOKEN_REFRESH_MS = 12 * 60 * 1000;
const POLL_INTERVAL_MS = 5_000;
const MAX_RETRIES = 3;

/** Tick on which a non-terminal run is asked whether it advanced; two quiet ones mean silence. */
const LIVENESS_TICK_MS = 10_000;

export type RunConnection = "live" | "reconnecting" | "polling";

/**
 * Subscribes to one run with one token, and renders the turn while it runs.
 *
 * INVARIANT: mount this keyed on `triggerRunId` + token. `useRealtimeRun`'s subscription effect does
 * not depend on its API client, so changing the token in place may leave the old subscription running
 * against a token that is about to expire — or leak it. A key change unmounts this subtree, whose
 * cleanup aborts both subscriptions, before the replacement mounts. That is the teardown-before-
 * resubscribe the ten-connection cap requires, and it is structural rather than remembered.
 *
 * Three failure paths the brief requires, all here: the token is refreshed before its fifteen minutes
 * are up, realtime errors are retried a bounded number of times, and after that the screen falls back
 * to REST polling so a broken transport degrades instead of freezing.
 *
 * A waitpoint arriving in the metadata invalidates the active-run query: the plan card and the
 * question panel render from `pendingWaitpoint` — the source that also survives a reload — so the
 * realtime signal's only job is to make that source refetch now instead of on the next visit.
 *
 * A fourth path covers the one the other three miss: a transport that goes quiet without erroring
 * (§4.6 step 6). Retries and the REST fallback both key off an error, so silence would otherwise
 * freeze the turn on screen for good.
 */
export function LiveRun({ chatId, run }: { chatId: string; run: ActiveRun }) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<RunConnection>("live");
  const retries = useRef(0);

  const {
    run: realtimeRun,
    error: runError,
    stop: stopRun,
  } = useRealtimeRun(run.triggerRunId ?? undefined, {
    accessToken: run.publicAccessToken,
    enabled: Boolean(run.triggerRunId),
  });

  const {
    parts,
    error: streamError,
    stop: stopStream,
  } = useRealtimeStream<string>(run.triggerRunId ?? "", STREAM_AGENT_TEXT, {
    accessToken: run.publicAccessToken,
    enabled: Boolean(run.triggerRunId),
  });

  useEffect(
    () => () => {
      stopRun();
      stopStream();
    },
    [stopRun, stopStream],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
    }, TOKEN_REFRESH_MS);

    return () => clearTimeout(timer);
  }, [chatId, queryClient]);

  useEffect(() => {
    if (!runError && !streamError) return;

    retries.current += 1;
    setConnection(retries.current >= MAX_RETRIES ? "polling" : "reconnecting");
  }, [runError, streamError]);

  useEffect(() => {
    if (connection !== "polling") return;

    const timer = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });
      void queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [connection, chatId, queryClient]);

  const finished = Boolean(realtimeRun?.finishedAt);

  /**
   * A finished turn moved more than the transcript: tool charges have settled against the ledger and
   * the server may have titled the chat, so the balance and the task list are both stale. The credits
   * chip is the one a stale value is most visible on — it sits on screen through the whole turn.
   */
  useEffect(() => {
    if (!finished) return;

    const settle = async () => {
      await queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });
      await queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.credits() }),
        queryClient.invalidateQueries({ queryKey: qk.chats() }),
      ]);
    };

    void settle();
  }, [finished, chatId, queryClient]);

  const metadata = parseMetadata(realtimeRun?.metadata);
  const waitpointId = metadata?.waitpoint?.id ?? null;

  useEffect(() => {
    if (!waitpointId) return;

    void queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
  }, [waitpointId, chatId, queryClient]);

  /**
   * Everything that changes when the turn actually advances, and nothing that changes on a bare
   * re-render. Realtime hands back fresh objects each update, so object identity cannot be the
   * signal — invocation *states* are included because a tool finishing moves no length.
   */
  const progress = metadata
    ? [
        metadata.phase,
        metadata.blocks.length,
        metadata.stepsCompleted,
        metadata.reasoningText?.length ?? 0,
        metadata.invocations.map((invocation) => invocation.state).join(","),
        parts.length,
      ].join("|")
    : `pending|${parts.length}`;

  const advancedSinceTick = useRef(true);
  const silentTicks = useRef(0);

  useEffect(() => {
    advancedSinceTick.current = true;
  }, [progress]);

  /**
   * A tick that finds nothing advanced since the previous one treats the transport as dead: the
   * transcript is re-read from Postgres, which is the authority, and `active-run` is re-read once to
   * mint a fresh token. This component is keyed on that token, so the refetch tears the dead
   * subscription down and resubscribes — replayed from chunk 0, so nothing is lost — and answers
   * `null` if the run is already over, which unmounts the overlay and clears the composer's Stop.
   *
   * INVARIANT: one `active-run` refetch per silent episode, reset by any progress. Each refetch mints
   * a token and resubscribes, so a tool that legitimately runs quiet for a minute must not churn the
   * ten-connection cap once per tick.
   */
  useEffect(() => {
    if (finished) return;

    const timer = setInterval(() => {
      if (advancedSinceTick.current) {
        advancedSinceTick.current = false;
        silentTicks.current = 0;
        return;
      }

      silentTicks.current += 1;
      void queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });

      if (silentTicks.current === 1) {
        void queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
      }
    }, LIVENESS_TICK_MS);

    return () => clearInterval(timer);
  }, [finished, chatId, queryClient]);

  return (
    <div className="flex flex-col">
      <ConnectionPill connection={connection} />
      {metadata ? (
        <StreamingOverlay
          metadata={metadata}
          streamedText={parts.join("")}
          timelineId={`live:${run.runId}`}
        />
      ) : (
        <PendingTurn />
      )}
    </div>
  );
}

/**
 * Run metadata arrives as loose JSON from another process, so it is parsed rather than cast. A shape
 * this repo does not recognise renders nothing instead of crashing the transcript.
 */
function parseMetadata(value: unknown): RunMetadata | null {
  const parsed = RunMetadata.safeParse(value);

  return parsed.success ? parsed.data : null;
}
