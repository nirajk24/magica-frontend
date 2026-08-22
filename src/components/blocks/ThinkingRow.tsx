"use client";

import { Brain } from "lucide-react";
import { TimelineRow } from "@/components/blocks/TimelineRow";
import type { BlockProps } from "@/components/blocks/types";

/**
 * The reasoning row.
 *
 * The label is the state: italic `Thinking` while the transcript is still arriving, italic `Reasoned`
 * once it has stopped. `durationMs` is written when the block closes, so the label is derived from
 * the data and needs no live-versus-persisted flag.
 */
export function ThinkingRow({ block }: BlockProps) {
  if (block.type !== "thinking") return null;

  const done = typeof block.durationMs === "number";

  return (
    <TimelineRow
      icon={Brain}
      label={done ? "Reasoned" : "Thinking"}
      labelClassName="italic"
      status={done ? undefined : "streaming"}
      durationMs={done ? block.durationMs : undefined}
      defaultOpen={!done}
    >
      <div className="rounded-card border border-border bg-bg-subtle p-3 text-sm leading-6 whitespace-pre-wrap text-fg-muted">
        {block.thinking}
      </div>
    </TimelineRow>
  );
}
