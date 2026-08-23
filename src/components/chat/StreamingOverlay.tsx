"use client";

import { useMemo } from "react";
import type { RunMetadata } from "@/contracts";
import { MessageTimeline } from "@/components/chat/MessageTimeline";
import { timelineFromRun } from "@/lib/timeline";

const EMPTY_REASONING: ReadonlyMap<number, string> = new Map();

/**
 * The turn as it happens.
 *
 * Presentational: it takes metadata, the joined stream, and the reasoning already seen, so a test
 * can drive it from fixtures. Trigger.dev's transport is not something MSW can intercept, so the
 * subscription lives in `LiveRun` and nothing about it leaks in here.
 *
 * `rememberedReasoning` is passed in rather than accumulated here because metadata reports only the
 * *current* block's reasoning, and this component is remounted every time the run resubscribes —
 * history kept in its own state is lost at exactly the moment the earlier rows need it.
 */

export function StreamingOverlay({
  metadata,
  streamedText,
  rememberedReasoning = EMPTY_REASONING,
  timelineId = "live",
}: {
  metadata: RunMetadata;
  streamedText: string;
  /** Reasoning for blocks the metadata no longer reports; accumulated by whoever owns the run. */
  rememberedReasoning?: ReadonlyMap<number, string>;
  /** Keys the step groups' expand state; the mounting run passes its own id. */
  timelineId?: string;
}) {
  const timeline = useMemo(
    () => timelineFromRun(metadata, streamedText, rememberedReasoning),
    [metadata, streamedText, rememberedReasoning],
  );

  return (
    <div className="flex flex-col" data-testid="streaming-overlay">
      <div aria-live="polite" aria-atomic="false">
        <MessageTimeline timeline={timeline} timelineId={timelineId} />
      </div>
    </div>
  );
}
