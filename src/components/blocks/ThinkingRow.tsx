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
 *
 * This is the one row whose label is muted while its body is not — measured off the dark captures,
 * where `Reasoned` is `--fg-muted` and both the brain and the transcript are `--fg`.
 *
 * The transcript is trimmed because models end reasoning with a newline, and `whitespace-pre-wrap`
 * turns that into a blank line the box then makes room for. A dangling partial tag is trimmed with
 * it: a reasoning stream cut mid-token leaves things like `</` behind, which reads as corruption.
 *
 * It shows no duration, and its chevron sits beside the label rather than at the far right — both
 * measured off the reference, which renders every reasoning row as a bare `Reasoned ⌄`.
 *
 * The body scrolls past a fixed height rather than growing. The reference's rows stay open and run to
 * a sentence or two, but reasoning length is the model's to decide, so the row is bounded here.
 */
export function ThinkingRow({ block, streaming }: BlockProps) {
  if (block.type !== "thinking") return null;

  const thinking = block.thinking.replace(/<\/?[a-zA-Z-]*>?\s*$/, "").trim();

  return (
    <TimelineRow
      icon={Brain}
      label={streaming ? "Thinking" : "Reasoned"}
      labelClassName="italic font-normal text-fg-muted"
      status={streaming ? "streaming" : undefined}
      chevron="inline"
    >
      {thinking.length > 0 ? (
        <div className="max-h-[220px] overflow-y-auto rounded-card border border-border p-3 text-xs leading-5 whitespace-pre-wrap text-fg">
          {thinking}
        </div>
      ) : undefined}
    </TimelineRow>
  );
}
