"use client";

import { Brain } from "lucide-react";
import { TimelineRow } from "@/components/blocks/TimelineRow";
import type { BlockProps } from "@/components/blocks/types";

/**
 * The reasoning row.
 *
 * The label is the state: italic `Thinking` while the transcript is still arriving, italic `Reasoned`
 * once it has stopped. A closed row with no text is a live projection whose prose has not been
 * persisted yet, so it renders as a bare row rather than an empty box.
 */
export function ThinkingRow({ block, streaming }: BlockProps) {
  if (block.type !== "thinking") return null;

  const body = block.thinking.length > 0;

  return (
    <TimelineRow
      icon={Brain}
      label={streaming ? "Thinking" : "Reasoned"}
      labelClassName="italic"
      status={streaming ? "streaming" : undefined}
      durationMs={block.durationMs}
      defaultOpen={streaming}
    >
      {body ? (
        <div className="rounded-card border border-border bg-bg-subtle p-3 text-sm leading-6 whitespace-pre-wrap text-fg-muted">
          {block.thinking}
        </div>
      ) : undefined}
    </TimelineRow>
  );
}
