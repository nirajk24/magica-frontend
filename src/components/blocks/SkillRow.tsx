"use client";

import { TimelineRow } from "@/components/blocks/TimelineRow";
import { iconColourFor, iconFor } from "@/components/blocks/icons";
import type { ToolCardProps } from "@/components/blocks/ToolCard";

/**
 * Skill loads are one-line rows — `Skill ✓ 110ms` — not expandable cards. A millisecond duration is
 * a cache hit and is worth showing, which is why the duration renders whatever its size.
 *
 * The bolt is the only coloured icon in the reference timeline.
 */
export function SkillRow({ tool }: ToolCardProps) {
  return (
    <TimelineRow
      icon={iconFor("skill")}
      iconClassName={iconColourFor("skill")}
      label="Skill"
      status={tool.status}
      durationMs={tool.durationMs}
    />
  );
}
