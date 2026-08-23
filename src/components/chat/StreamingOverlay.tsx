"use client";

import { useMemo, useState } from "react";
import type { RunMetadata } from "@/contracts";
import { MessageTimeline } from "@/components/chat/MessageTimeline";
import { timelineFromRun } from "@/lib/timeline";

/**
 * The turn as it happens.
 *
 * Presentational on purpose: it takes metadata and the joined stream, so a test can drive it from
 * fixtures.
 *
 * It does keep one piece of history: `RunMetadata` reports only the *current* block's reasoning, so
 * each block's transcript is remembered as it goes by. Without that, an earlier block's reasoning
 * disappears off the screen the moment the next one opens. Trigger.dev's transport is not something MSW can intercept, so the subscription lives in
 * `LiveRun` and nothing about it leaks in here.
 */
type Remembered = { reasoning: string | null; byIndex: ReadonlyMap<number, string> };

const EMPTY_REMEMBERED: Remembered = { reasoning: null, byIndex: new Map() };

export function StreamingOverlay({
  metadata,
  streamedText,
  timelineId = "live",
}: {
  metadata: RunMetadata;
  streamedText: string;
  /** Keys the step groups' expand state; the mounting run passes its own id. */
  timelineId?: string;
}) {
  const lastThinkingIndex = metadata.blocks.reduce(
    (found, block, index) => (block.type === "thinking" ? index : found),
    -1,
  );
  const reasoning = metadata.reasoningText ?? null;

  const [remembered, setRemembered] = useState<Remembered>(EMPTY_REMEMBERED);

  if (remembered.reasoning !== reasoning) {
    const byIndex = new Map(remembered.byIndex);
    if (lastThinkingIndex >= 0 && reasoning) byIndex.set(lastThinkingIndex, reasoning);
    setRemembered({ reasoning, byIndex });
  }

  const timeline = useMemo(
    () => timelineFromRun(metadata, streamedText, remembered.byIndex),
    [metadata, streamedText, remembered],
  );

  return (
    <div className="flex flex-col" data-testid="streaming-overlay">
      <div aria-live="polite" aria-atomic="false">
        <MessageTimeline timeline={timeline} timelineId={timelineId} />
      </div>
    </div>
  );
}
