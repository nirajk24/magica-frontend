"use client";

import { Check, ChevronDown, ChevronRight, Clock, Loader2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
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
 */
export function TimelineRow({
  icon: Icon,
  label,
  labelClassName,
  status,
  durationMs,
  right,
  defaultOpen = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  labelClassName?: string;
  status?: RowStatus;
  durationMs?: number | null;
  right?: ReactNode;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const expandable = children !== undefined;
  const Chevron = open ? ChevronDown : ChevronRight;

  const header = (
    <>
      <Icon className="size-4 shrink-0 text-fg-muted" />
      <span className={cn("text-sm font-medium text-fg", labelClassName)}>{label}</span>
      <StatusGlyph status={status} />
      {typeof durationMs === "number" && (
        <span className="flex items-center gap-1 font-mono text-xs text-fg-muted">
          <Clock className="size-3" aria-hidden />
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
          <span className="ml-auto flex items-center gap-2">
            {right}
            <Chevron className="size-4 text-fg-subtle" aria-hidden />
          </span>
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
    return <Loader2 className="size-3.5 animate-spin text-info" aria-label="Running" />;
  }
  if (status === "completed") {
    return <Check className="size-3.5 text-success" aria-label="Completed" />;
  }
  if (status === "failed") {
    return <X className="size-3.5 text-danger" aria-label="Failed" />;
  }

  return null;
}

/** The label/value grid a tool card's body is made of, with the reference's `View more` cut-off. */
export function DetailRows({
  rows,
  visible = 5,
  footer,
}: {
  rows: readonly (readonly [string, string])[];
  visible?: number;
  footer?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, visible);

  if (rows.length === 0 && !footer) return null;

  return (
    <div className="rounded-card border border-border bg-bg-subtle p-3">
      <dl className="grid grid-cols-[minmax(0,90px)_1fr] gap-x-4 gap-y-2 text-sm">
        {shown.map(([label, value]) => (
          <div key={label} className="col-span-2 grid grid-cols-subgrid">
            <dt className="text-fg-muted">{label}</dt>
            <dd className="break-words text-fg">{value}</dd>
          </div>
        ))}
      </dl>

      {rows.length > visible && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm text-info"
        >
          {expanded ? "View less" : "View more"}
        </button>
      )}

      {footer}
    </div>
  );
}
