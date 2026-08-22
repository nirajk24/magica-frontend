import type { BlockProps } from "@/components/blocks/types";
import { formatTokens } from "@/lib/format";

/**
 * Token counts.
 *
 * No capture shows this row — the reference reports token usage nowhere — but the brief lists `usage`
 * among the content blocks that must render in order. It sits inside the step group, which a finished
 * turn collapses, so it is invisible at rest and reachable on expand: the least visible way to meet a
 * requirement the product itself does not surface.
 */
export function UsageRow({ block }: BlockProps) {
  if (block.type !== "usage") return null;

  return (
    <p className="font-mono text-xs text-fg-subtle">
      {formatTokens(block.inputTokens)} in · {formatTokens(block.outputTokens)} out
    </p>
  );
}
