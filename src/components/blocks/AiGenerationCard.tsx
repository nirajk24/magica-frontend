"use client";

import { ToolCard, type ToolCardProps } from "@/components/blocks/ToolCard";
import { fieldLabel, fieldValue } from "@/components/blocks/tool-output";

/**
 * The media-generation card. Identical chrome to the generic one; the only difference is that the
 * reference orders these fields deliberately and hides the rest behind `View more`.
 *
 * `Model` comes from the invocation's `subModelId` rather than the tool input, because the sub-model
 * is chosen at execution time — the input records what was asked for, not what answered.
 */
const ORDER = ["tool", "model", "prompt", "size", "quality", "aspect_ratio", "resolution"];

export function AiGenerationCard({ tool }: ToolCardProps) {
  const rows = orderedRows(tool.input);
  const detail: [string, string][] = tool.subModelId
    ? [["Model", tool.subModelId], ...rows.filter(([label]) => label !== "Model")]
    : rows;

  return <ToolCard tool={tool} rows={detail} visible={5} />;
}

function orderedRows(input: unknown): [string, string][] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];

  const entries = input as Record<string, unknown>;
  const seen = new Set<string>();
  const rows: [string, string][] = [];

  for (const key of ORDER) {
    if (key in entries) {
      rows.push([fieldLabel(key), fieldValue(entries[key])]);
      seen.add(key);
    }
  }
  for (const [key, value] of Object.entries(entries)) {
    if (!seen.has(key)) rows.push([fieldLabel(key), fieldValue(value)]);
  }

  return rows;
}
