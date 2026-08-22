"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

/**
 * The reference's `Working · N steps` / `Completed N steps` collapsible group.
 *
 * A live group is open so the user watches the steps arrive; a finished one collapses to its header,
 * which is what the terminal captures show. `steps` counts reasoning, tool calls and step updates —
 * not the token-usage footer.
 */
export function StepGroup({
  steps,
  streaming,
  children,
}: {
  steps: number;
  streaming: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(streaming);
  const Chevron = open ? ChevronDown : ChevronRight;

  const label = streaming
    ? `Working · ${steps} ${steps === 1 ? "step" : "steps"}`
    : `Completed ${steps} ${steps === 1 ? "step" : "steps"}`;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-fit items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        {label}
        <Chevron className="size-4" aria-hidden />
      </button>

      {open && <div className="flex flex-col gap-3">{children}</div>}
    </div>
  );
}
