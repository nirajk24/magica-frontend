"use client";

import { ArrowDown } from "lucide-react";

/**
 * The floating jump-to-latest control, centred on the content column and sitting 24px above the
 * composer's top edge — both read off the reference, which shows it only while the transcript is
 * scrolled up.
 */
export function ScrollToBottom({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to latest"
      onClick={onClick}
      className="absolute bottom-6 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-bg text-fg shadow-md transition-colors hover:bg-surface"
    >
      <ArrowDown className="size-4" aria-hidden />
    </button>
  );
}
