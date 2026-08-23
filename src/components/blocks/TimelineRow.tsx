"use client";

import { ChevronDown, ChevronRight, CircleCheck, CircleX, Clock, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import type { ToolView } from "@/lib/timeline";
import { formatDuration } from "@/lib/format";

type RowStatus = ToolView["status"] | "streaming";

/**
 * The chrome every timeline row shares: icon, label, status, duration, a right-hand slot, and an
 * optional collapsible body. One place, so `Skill ✓ 110ms` and an expanded AI Generation card cannot
 * drift apart.
 *
 * A row with no `children` is a one-liner and renders no chevron.
 *
 * The colour hierarchy is sampled, not chosen: icons and durations are `--fg`, and the reasoning
 * label is the only muted one. The Skill bolt is the single coloured icon in the reference — `--amber`,
 * which is the pixel that token was sampled from in the first place.
 */
export function TimelineRow({
  icon: Icon,
  iconClassName,
  label,
  labelClassName,
  status,
  durationMs,
  right,
  chevron = "end",
  defaultOpen = true,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  label: string;
  labelClassName?: string;
  status?: RowStatus;
  durationMs?: number | null;
  right?: ReactNode;
  /** Reasoning rows keep the chevron beside the label; tool cards push it to the far right. */
  chevron?: "inline" | "end";
  /**
   * Rows open with their step group rather than one at a time. Expanding a finished group in the
   * reference reveals every body at once — the group header is the only thing that collapses.
   */
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expandable = children !== undefined;
  const Chevron = open ? ChevronDown : ChevronRight;

  const header = (
    <>
      <Icon className={cn("size-3.5 shrink-0 text-fg", iconClassName)} />
      <span className={cn("text-[13px] font-semibold text-fg", labelClassName)}>{label}</span>
      {expandable && chevron === "inline" && (
        <Chevron className="size-3.5 text-fg-muted" aria-hidden />
      )}
      <StatusGlyph status={status} />
      {typeof durationMs === "number" && (
        <span className="flex items-center gap-1 font-mono text-[11px] text-fg">
          <Clock className="size-2.5" aria-hidden />
          {formatDuration(durationMs)}
        </span>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex items-center gap-2 text-left"
        >
          {header}
          {chevron === "end" && (
            <span className="ml-auto flex items-center gap-2">
              {right}
              <Chevron className="size-3.5 text-fg-subtle" aria-hidden />
            </span>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {header}
          {right && <span className="ml-auto">{right}</span>}
        </div>
      )}

      {expandable && open && <div className="pl-6">{children}</div>}
    </div>
  );
}

function StatusGlyph({ status }: { status?: RowStatus }) {
  if (status === "running" || status === "pending" || status === "streaming") {
    return <Loader2 className="size-3 animate-spin text-info" aria-label="Running" />;
  }
  if (status === "completed") {
    return <CircleCheck className="size-3 text-success" aria-label="Completed" />;
  }
  if (status === "failed") {
    return <CircleX className="size-3 text-danger" aria-label="Failed" />;
  }

  return null;
}

export type DetailRow = readonly [string, ReactNode];

/**
 * The label/value grid a tool card's body is made of, with the reference's `View more` cut-off.
 *
 * `trailingRows` sit after that link rather than inside the slice — the reference orders an
 * AI Generation card `Size · Quality · View more · Output`, so the output is never what `View more`
 * is hiding, and a divider separates it from the fields above.
 *
 * Detail text is 12px. Measured by comparing the same word — `Quality` — in both, after fixing each
 * screenshot's device scale: 10.4 CSS px of glyph against our 12.5.
 *
 * The body is a raised `--surface` box. `--bg-subtle` is the same value as the canvas in dark, so
 * using it here left the box with no fill at all in the theme the reference shows it raised in.
 */
export function DetailRows({
  rows,
  visible = 5,
  trailingRows = [],
  footer,
  onViewMore,
}: {
  rows: readonly DetailRow[];
  visible?: number;
  trailingRows?: readonly DetailRow[];
  footer?: ReactNode;
  /** Opens the tool detail panel. Without it the link states why it does nothing. */
  onViewMore?: () => void;
}) {
  if (rows.length === 0 && trailingRows.length === 0 && !footer) return null;

  const shown = rows.slice(0, visible);

  return (
    <div className="rounded-card border border-border p-3">
      <Grid rows={shown} />

      {rows.length > visible &&
        (onViewMore ? (
          <button
            type="button"
            onClick={onViewMore}
            className="mt-2 text-xs text-info transition-colors hover:underline"
          >
            View more
          </button>
        ) : (
          <DisabledAction
            label="View more"
            reason="The full tool detail panel isn't part of this build yet."
          />
        ))}

      {trailingRows.length > 0 && (
        <div className="mt-2.5 border-t border-border pt-2.5">
          <Grid rows={trailingRows} />
        </div>
      )}

      {footer}
    </div>
  );
}

/**
 * `View more` opens the tool detail side panel in the reference, not an in-card expansion — so until
 * that panel exists it states why it does nothing rather than inventing a different behaviour.
 */
function DisabledAction({ label, reason }: { label: string; reason: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-disabled
        onClick={(event) => event.preventDefault()}
        className="mt-2 cursor-not-allowed text-xs text-info/60"
      >
        {label}
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

function Grid({ rows }: { rows: readonly DetailRow[] }) {
  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-[minmax(0,90px)_1fr] gap-x-4 gap-y-2.5 text-xs leading-5">
      {rows.map(([label, value]) => (
        <div key={label} className="col-span-2 grid grid-cols-subgrid">
          <dt className="text-fg-muted">{label}</dt>
          <dd className="break-words text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
