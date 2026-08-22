import type { ContentBlock } from "@/contracts";
import type { ToolView } from "@/lib/timeline";

export type BlockProps = {
  block: ContentBlock;
  tools: ReadonlyMap<string, ToolView>;
};
