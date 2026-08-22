import type { ContentBlock } from "@/contracts";
import type { ToolView } from "@/lib/timeline";

export type BlockProps = {
  block: ContentBlock;
  tools: ReadonlyMap<string, ToolView>;
  /** True while this row is still being written. Never a live-versus-persisted discriminator. */
  streaming?: boolean;
  /** URLs the turn renders as media elsewhere, so prose must not repeat them. */
  assetUrls?: ReadonlySet<string>;
};
