"use client";

import { Maximize2, Minimize2, X } from "lucide-react";
import { createElement, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconColourFor, iconFor } from "@/components/blocks/icons";
import { inputImageUrls, orderedInputRows, outputUrls } from "@/components/blocks/tool-output";
import { cn } from "@/lib/cn";
import { formatCredits } from "@/lib/format";
import type { ToolView } from "@/lib/timeline";

/**
 * The full detail behind a tool card's `View more`.
 *
 * **The content column makes room for it rather than sitting underneath.** The reference narrows the
 * transcript and the composer when the panel opens; nothing is clipped. Measured at 538px, and both
 * the panel's entrance and the column's reflow are animated. Maximizing swaps the width for the
 * whole window and the toggle then reads `Restore`.
 *
 * Fields are the card's, in the same order and from the same helper, but **untruncated** — the card
 * shows five and the panel is where the rest lives. It reads the `ToolView` it is handed rather than
 * looking an invocation up, so the panel and the card can never describe the same call differently.
 */
/** Measured off the reference. The shell reserves exactly this much, so the two cannot disagree. */
export const PANEL_WIDTH = 538;

export function ToolDetailPanel({ tool, onClose }: { tool: ToolView; onClose: () => void }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const rows = orderedInputRows(tool.input, tool.subModelId);
  const inputImages = inputImageUrls(tool.input);
  const outputs = outputUrls(tool);
  const charged = tool.creditUsed && tool.creditUsed !== "0";

  return (
    <aside
      role="dialog"
      aria-label={`${tool.display.label} detail`}
      style={{ width: maximized ? "100vw" : PANEL_WIDTH }}
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex max-w-full flex-col border-l border-border bg-bg",
        "animate-in duration-200 ease-out slide-in-from-right",
        "transition-[width] duration-200 ease-out",
      )}
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <ToolIcon name={tool.display.icon} />
        <span className="min-w-0 flex-1 truncate text-sm text-fg">{tool.display.label}</span>

        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label={maximized ? "Restore" : "Maximize"}
            onClick={() => setMaximized(!maximized)}
            className="rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            {maximized ? (
              <Minimize2 className="size-4" aria-hidden />
            ) : (
              <Maximize2 className="size-4" aria-hidden />
            )}
          </TooltipTrigger>
          <TooltipContent>{maximized ? "Restore" : "Maximize"}</TooltipContent>
        </Tooltip>

        <button
          type="button"
          aria-label="Close detail"
          onClick={onClose}
          className="rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 text-[15px] leading-relaxed">
        {rows.map(([label, value]) => (
          <p key={label} className="break-words text-fg">
            {label}: {value}
          </p>
        ))}

        {tool.errorMessage && (
          <p className="break-words text-danger">Error: {tool.errorMessage}</p>
        )}

        <ImageSection label="Input Images" urls={inputImages} />
        <ImageSection label="Output" urls={outputs} />

        {charged && (
          <p className="text-fg">Credits used: {formatCredits(tool.creditUsed!)}</p>
        )}
      </div>
    </aside>
  );
}

/** The registry chooses the glyph at runtime, so it is created here rather than during render. */
function ToolIcon({ name }: { name: string }) {
  return createElement(iconFor(name), {
    className: cn("size-4 shrink-0 text-fg", iconColourFor(name)),
  });
}

/** The reference underlines this label and lays the thumbnails out beneath it. */
function ImageSection({ label, urls }: { label: string; urls: readonly string[] }) {
  if (urls.length === 0) return null;

  return (
    <div>
      <p className="inline-block border-b border-border pb-1 text-fg">{label}:</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {urls.map((url) => (
          <img
            key={url}
            src={url}
            alt={label}
            className="max-h-40 rounded-card bg-surface"
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
