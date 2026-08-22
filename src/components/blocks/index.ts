import { createElement, type FC, type ReactElement } from "react";
import { CitationsRow } from "@/components/blocks/CitationsRow";
import { StepUpdateRow } from "@/components/blocks/StepUpdateRow";
import { TextBlock } from "@/components/blocks/TextBlock";
import { ThinkingRow } from "@/components/blocks/ThinkingRow";
import { ToolUseBlock } from "@/components/blocks/ToolUseBlock";
import { UsageRow } from "@/components/blocks/UsageRow";
import type { BlockProps } from "@/components/blocks/types";

export { toolCardRenderers, cardFor } from "@/components/blocks/ToolUseBlock";

/**
 * The block renderer registry. Adding a block type is one entry here.
 *
 * INVARIANT: a lookup miss must render nothing rather than throw. The backend can ship a block type
 * before this repo knows about it, and a crash would take the whole transcript with it.
 */
export const blockRenderers: Record<string, FC<BlockProps>> = {
  text: TextBlock,
  thinking: ThinkingRow,
  tool_use: ToolUseBlock,
  usage: UsageRow,
  citations: CitationsRow,
  step_update: StepUpdateRow,
};

/** What an unregistered block type renders: nothing, and no exception. */
export function UnknownBlock(): null {
  return null;
}

export function rendererFor(type: string): FC<BlockProps> {
  return blockRenderers[type] ?? UnknownBlock;
}

/** Dispatches a block to its renderer. `createElement` because the component is chosen at runtime. */
export function Block({ block, tools, streaming }: BlockProps): ReactElement {
  return createElement(rendererFor(block.type), { block, tools, streaming });
}
