import type { BlockProps } from "@/components/blocks/types";

/** Token counts. No capture shows this row, but the brief lists `usage` as a block that must render. */
export function UsageRow({ block }: BlockProps) {
  if (block.type !== "usage") return null;

  return (
    <p className="font-mono text-xs text-fg-subtle">
      {block.inputTokens.toLocaleString("en-US")} in · {block.outputTokens.toLocaleString("en-US")} out
    </p>
  );
}
