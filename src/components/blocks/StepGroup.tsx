"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The reference's `Working · N steps` / `Completed N steps` collapsible group.
 *
 * A live group is open so the user watches the steps arrive; a finished one collapses to its header,
 * which is what the terminal captures show. `steps` counts reasoning, tool calls and step updates —
 * not the token-usage footer.
 *
 * A group holding a failed tool stays open. Every capture of a collapsed group is a group that
 * succeeded, and a failure the reader has to go looking for is not explainable from the screen.
 *
 * The chevron follows the captures: present while the group is open, absent when it is closed. No
 * capture can show a hovered-but-closed header, so hover and keyboard focus reveal it — the header is
 * the click target either way, and an affordance nobody can find is worse than a small divergence.
 */
export function StepGroup({
  steps,
  streaming,
  failed = false,
  children,
}: {
  steps: number;
  streaming: boolean;
  failed?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(streaming || failed);
  const Chevron = open ? ChevronDown : ChevronRight;
  const unit = steps === 1 ? "step" : "steps";

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="group/steps flex w-fit items-center gap-1 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        {streaming ? (
          <span>
            Working ·{" "}
            <span className="font-semibold text-fg">
              {steps} {unit}
            </span>
          </span>
        ) : (
          <span>
            Completed {steps} {unit}
          </span>
        )}

        <Chevron
          aria-hidden
          className={cn(
            "size-4 transition-opacity",
            open ? "opacity-100" : "opacity-0 group-hover/steps:opacity-100 group-focus-visible/steps:opacity-100",
          )}
        />
      </button>

      {open && <div className="flex flex-col gap-3">{children}</div>}
    </div>
  );
}
