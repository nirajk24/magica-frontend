"use client";

import type { ReactNode } from "react";
import type { ToolView } from "@/lib/timeline";
import { DetailRows, TimelineRow } from "@/components/blocks/TimelineRow";
import { iconFor } from "@/components/blocks/icons";
import { inputRows, outputUrls } from "@/components/blocks/tool-output";
import { formatCredits } from "@/lib/format";

export type ToolCardProps = { tool: ToolView };

/**
 * The generic tool card, and the fallback for a tool this repo has never heard of.
 *
 * Everything visible comes from the invocation itself — `display.label` and `display.icon` are
 * authored by the backend registry — so a tool shipped on the server renders sensibly here without a
 * frontend change.
 */
export function ToolCard({
  tool,
  rows,
  visible,
}: ToolCardProps & { rows?: readonly (readonly [string, string])[]; visible?: number }) {
  const Icon = iconFor(tool.display.icon);
  const detail = rows ?? inputRows(tool.input);
  const urls = outputUrls(tool);

  return (
    <TimelineRow
      icon={Icon}
      label={tool.display.label}
      status={tool.status}
      durationMs={tool.durationMs}
      right={<CreditsChip tool={tool} />}
      defaultOpen={tool.status === "running" || tool.status === "failed"}
    >
      <DetailRows
        rows={detail}
        visible={visible ?? 5}
        footer={
          <>
            {tool.errorMessage && (
              <p className="mt-3 text-sm leading-6 text-danger">{tool.errorMessage}</p>
            )}
            {urls.length > 0 && <OutputStrip urls={urls} label={tool.display.label} />}
          </>
        }
      />
    </TimelineRow>
  );
}

/** Right-aligned on the header once a tool has settled, the way the reference shows `0.21M ⌄`. */
export function CreditsChip({ tool }: ToolCardProps): ReactNode {
  if (tool.status !== "completed" || !tool.creditUsed || tool.creditUsed === "0") return null;

  return <span className="font-mono text-xs text-fg-muted">{formatCredits(tool.creditUsed)}</span>;
}

export function OutputStrip({ urls, label }: { urls: readonly string[]; label: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {urls.map((url) => (
        <img
          key={url}
          src={url}
          alt={`Output of ${label}`}
          className="max-h-32 rounded-card bg-surface"
          loading="lazy"
        />
      ))}
    </div>
  );
}
