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
 */
export function MessageTimeline({ timeline }: { timeline: Timeline }) {
  return (
    <div className="flex flex-col gap-4">
      {timeline.segments.map((segment) => (
        <div key={segment.segment} className="flex flex-col gap-3">
          {segment.rows.length > 0 && (
            <StepGroup steps={segment.stepCount} streaming={segment.streaming}>
              {segment.rows.map((block, index) => (
                <Block key={`${segment.segment}-${index}`} block={block} tools={timeline.tools} />
              ))}
            </StepGroup>
          )}

          {segment.prose.map((block, index) => (
            <Block key={`${segment.segment}-prose-${index}`} block={block} tools={timeline.tools} />
          ))}
        </div>
      ))}
    </div>
  );
}
