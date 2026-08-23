"use client";

import { Markdown } from "@/components/chat/Markdown";
import type { BlockProps } from "@/components/blocks/types";

export function TextBlock({ block, assetUrls }: BlockProps) {
  if (block.type !== "text") return null;

  return (
    <div className="text-base leading-7 text-fg">
      <Markdown suppressUrls={assetUrls}>{block.text}</Markdown>
    </div>
  );
}
