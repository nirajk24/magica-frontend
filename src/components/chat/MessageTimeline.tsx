"use client";

import { Block } from "@/components/blocks";
import { StepGroup } from "@/components/blocks/StepGroup";
import type { Timeline } from "@/lib/timeline";

/**
 * Renders one timeline, whichever source it came from.
 *
 * INVARIANT: nothing here may branch on live-versus-persisted. `RunMetadata` and `MessageDTO` are
 * normalised into `Timeline` before they arrive, and that equivalence is what makes reload recovery
 * a single code path.
 *
 * Rows sit inside the segment's step group and prose sits below it, which is the order every terminal
 * capture shows.
 *
 * A segment with no steps has no group and shows no rows. The only block that reaches a segment
 * alone is `usage`, and a turn that just answered a question should not be topped with a token
 * count — the brief requires the block to render, not to be the first thing anyone reads. It
 * renders where it always has, inside the group, which is collapsed at rest.
 */
export function MessageTimeline({
  timeline,
  timelineId,
}: {
  timeline: Timeline;
  /** Stable identity for this turn (message id, or the live run's id) — keys the step groups'
   *  expand state so a virtualized remount does not reset it. */
  timelineId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {timeline.segments.map((segment) => (
        <div key={segment.segment} className="flex flex-col gap-3">
          {segment.stepCount > 0 && segment.rows.length > 0 && (
            <StepGroup
              groupKey={`${timelineId}:${segment.segment}`}
              steps={segment.stepCount}
              streaming={segment.streaming}
              failed={segment.failed}
            >
              {segment.rows.map((item, index) => (
                <Block
                  key={`${segment.segment}-${index}`}
                  block={item.block}
                  tools={timeline.tools}
                  streaming={item.streaming}
                  assetUrls={timeline.assetUrls}
                />
              ))}
            </StepGroup>
          )}

          {segment.prose.map((item, index) => (
            <Block
              key={`${segment.segment}-prose-${index}`}
              block={item.block}
              tools={timeline.tools}
              streaming={item.streaming}
              assetUrls={timeline.assetUrls}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
