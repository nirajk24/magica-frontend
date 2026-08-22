"use client";

import { useMemo } from "react";
import type { RunMetadata } from "@/contracts";
import { MessageTimeline } from "@/components/chat/MessageTimeline";
import { timelineFromRun } from "@/lib/timeline";

/**
 * The turn as it happens.
 *
 * Presentational on purpose: it takes metadata and the joined stream, so a test can drive it from
 * fixtures. Trigger.dev's transport is not something MSW can intercept, so the subscription lives in
 * `LiveRun` and nothing about it leaks in here.
 */
export function StreamingOverlay({
  metadata,
  streamedText,
}: {
  metadata: RunMetadata;
  streamedText: string;
}) {
  const timeline = useMemo(() => timelineFromRun(metadata, streamedText), [metadata, streamedText]);

  return (
    <div className="flex flex-col" data-testid="streaming-overlay">
      <div aria-live="polite" aria-atomic="false">
        <MessageTimeline timeline={timeline} />
      </div>
    </div>
  );
}
