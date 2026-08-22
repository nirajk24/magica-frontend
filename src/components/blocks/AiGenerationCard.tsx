"use client";

import { ToolCard, type ToolCardProps } from "@/components/blocks/ToolCard";
import { orderedInputRows } from "@/components/blocks/tool-output";

/**
 * The media-generation card. Identical chrome to the generic one; the only difference is that the
 * reference orders these fields deliberately and hides the rest behind `View more`.
 */
export function AiGenerationCard({ tool }: ToolCardProps) {
  return <ToolCard tool={tool} rows={orderedInputRows(tool.input, tool.subModelId)} visible={5} />;
}
