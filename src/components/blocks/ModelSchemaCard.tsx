"use client";

import { ToolCard, type ToolCardProps } from "@/components/blocks/ToolCard";

/** Schema lookups show a single `Model ID` row, and a cache hit still shows its duration. */
export function ModelSchemaCard({ tool }: ToolCardProps) {
  return <ToolCard tool={tool} visible={1} />;
}
