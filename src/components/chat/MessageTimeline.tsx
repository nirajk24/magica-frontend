"use client";

import { Block } from "@/components/blocks";
import type { Timeline } from "@/lib/timeline";

/**
 * Renders one timeline, whichever source it came from.
 *
 * INVARIANT: nothing here may branch on live-versus-persisted. `RunMetadata` and `MessageDTO` are
 * normalised into `Timeline` before they arrive, and that equivalence is what makes reload recovery
 * a single code path.
 */
export function MessageTimeline({ timeline }: { timeline: Timeline }) {
  return (
    <div className="flex flex-col gap-4">
      {timeline.segments.map((segment) => (
        <div key={segment.segment} className="flex flex-col gap-3">
          {segment.rows.length > 0 && (
            <div className="flex flex-col gap-3">
              {segment.rows.map((block, index) => (
                <Block key={`${segment.segment}-${index}`} block={block} tools={timeline.tools} />
              ))}
            </div>
          )}

          {segment.prose.map((block, index) => (
            <Block key={`${segment.segment}-prose-${index}`} block={block} tools={timeline.tools} />
          ))}
        </div>
      ))}
    </div>
  );
}
