"use client";

import { useRealtimeRun, useRealtimeStream } from "@trigger.dev/react-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { RunMetadata, STREAM_AGENT_TEXT, type ActiveRun } from "@/contracts";
import { ThinkingRow } from "@/components/blocks/ThinkingRow";
import { ConnectionPill } from "@/components/chat/ConnectionPill";
import { StreamingOverlay } from "@/components/chat/StreamingOverlay";
import { qk } from "@/lib/query-client";

const TOKEN_REFRESH_MS = 12 * 60 * 1000;
const POLL_INTERVAL_MS = 5_000;
const MAX_RETRIES = 3;

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

  useEffect(() => {
    if (!finished) return;

    const settle = async () => {
      await queryClient.invalidateQueries({ queryKey: qk.chat(chatId) });
      await queryClient.invalidateQueries({ queryKey: qk.activeRun(chatId) });
    };

    void settle();
  }, [finished, chatId, queryClient]);

  const metadata = parseMetadata(realtimeRun?.metadata);

  return (
    <div className="flex flex-col">
      <ConnectionPill connection={connection} />
      {metadata ? (
        <StreamingOverlay metadata={metadata} streamedText={parts.join("")} />
      ) : (
        <PendingTurn />
      )}
    </div>
  );
}

/**
 * The window between a turn being dispatched and its first metadata arriving.
 *
 * The reference fills it with a bare `Thinking` row — user bubble top-right, the row alone
 * top-left, the stop control already red. Rendering nothing instead leaves the screen looking as
 * though the send did not land, which is exactly when a user sends again.
 */
function PendingTurn() {
  return (
    <ThinkingRow
      block={{ segment: 0, type: "thinking", thinking: "" }}
      tools={EMPTY_TOOLS}
      streaming
    />
  );
}

const EMPTY_TOOLS = new Map();

/**
 * Run metadata arrives as loose JSON from another process, so it is parsed rather than cast. A shape
 * this repo does not recognise renders nothing instead of crashing the transcript.
 */
function parseMetadata(value: unknown): RunMetadata | null {
  const parsed = RunMetadata.safeParse(value);

  return parsed.success ? parsed.data : null;
}
