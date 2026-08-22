"use client";

import { createElement } from "react";
import { AiGenerationCard } from "@/components/blocks/AiGenerationCard";
import { ModelSchemaCard } from "@/components/blocks/ModelSchemaCard";
import { SkillRow } from "@/components/blocks/SkillRow";
import { ToolCard, type ToolCardProps } from "@/components/blocks/ToolCard";
import type { BlockProps } from "@/components/blocks/types";
import type { ToolView } from "@/lib/timeline";

/**
 * Bespoke cards per tool. Adding one is a single entry, which is the frontend half of the "one
 * authoritative registry" claim.
 *
 * INVARIANT: a miss falls back to `ToolCard`, which reads only the registry's `display`. That is what
 * lets the backend ship a tool this repo has never compiled against.
 */
export const toolCardRenderers: Record<string, React.ComponentType<ToolCardProps>> = {
  gpt_image_2: AiGenerationCard,
  crop_image: AiGenerationCard,
  merge_videos: AiGenerationCard,
  get_model_schema: ModelSchemaCard,
  load_skill: SkillRow,
  read_skill_asset: SkillRow,
};

export function cardFor(toolName: string): React.ComponentType<ToolCardProps> {
  return toolCardRenderers[toolName] ?? ToolCard;
}

/**
 * A `tool_use` block renders the invocation it points at.
 *
 * The block carries structure and the invocation carries state, so a card with no matching
 * invocation yet still renders from the block alone rather than disappearing.
 */
export function ToolUseBlock({ block, tools }: BlockProps) {
  if (block.type !== "tool_use") return null;

  const tool = tools.get(block.id) ?? placeholderTool(block.id, block.name, block.input);

  return createElement(cardFor(tool.toolName), { tool });
}

function placeholderTool(toolUseId: string, name: string, input: unknown): ToolView {
  return {
    id: toolUseId,
    toolUseId,
    toolName: name,
    subModelId: null,
    display: { label: name, icon: "tool" },
    status: "pending",
    input,
    output: null,
    errorMessage: null,
    creditUsed: null,
    durationMs: null,
    resultUrls: [],
    resultSummary: null,
  };
}
