"use client";

import { Markdown } from "@/components/chat/Markdown";
import type { BlockProps } from "@/components/blocks/types";

export function TextBlock({ block }: BlockProps) {
  if (block.type !== "text") return null;

  return (
    <div className="text-[15px] leading-7 text-fg">
      <Markdown>{block.text}</Markdown>
    </div>
  );
}
