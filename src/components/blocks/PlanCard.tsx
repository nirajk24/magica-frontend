"use client";

import { Diamond, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlanApprovalPayload } from "@/contracts";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/cn";
import { formatCredits } from "@/lib/format";

/**
 * The actionable plan card — the reference renders it inline in the transcript, not as an overlay,
 * and the PDF's word "overlay" loses to the reference's appearance.
 *
 * Only the *actionable* microstate lives here. `Plan submitted ⟳`, `Changes requested` and
 * `Plan approved ✓` are timeline rows the run itself emits, so they arrive through the same block
 * renderer as every other step — this card exists exactly while the waitpoint is pending and
 * unmounts on resolution.
 *
 * Keyboard: `Enter` runs all (the hint the card carries), `⌘+Enter` submits changes while the
 * textarea is open. Every credit figure is the server's estimate; nothing is computed here.
 */
export function PlanCard({
  plan,
  resolving,
  onApprove,
  onRequestChanges,
}: {
  plan: PlanApprovalPayload;
  /** True while a resolution is in flight, so the actions read busy instead of double-firing. */
  resolving: boolean;
  onApprove: (executionMode: "auto" | "step_by_step") => void;
  onRequestChanges: (feedback: string) => void;
}) {
  const [changesOpen, setChangesOpen] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (changesOpen || resolving) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.metaKey || event.ctrlKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      onApprove("auto");
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [changesOpen, resolving, onApprove]);

  return (
    <section
      aria-label="Plan approval"
      className="rounded-card border border-border p-4"
    >
      <h3 className="text-[15px] font-semibold text-fg">{plan.title}</h3>
      <p className="mt-1 text-sm text-fg-muted">{plan.overview}</p>

      <ol className="mt-4 flex flex-col gap-3">
        {plan.steps.map((step, index) => (
          <li key={step.key} className="flex items-start gap-3">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-bg text-[11px] text-fg-muted">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-fg">{step.title}</span>
              <span className="block text-sm text-fg-muted">{step.description}</span>
            </span>
            <CreditChip amount={step.estimatedCredits} />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
        <span className="text-fg-muted">Estimated total</span>
        <CreditChip amount={plan.estimatedTotal} />
      </div>

      {changesOpen && (
        <div className="mt-3">
          <textarea
            autoFocus
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                if (feedback.trim()) onRequestChanges(feedback.trim());
              }
            }}
            placeholder="What would you like changed? (e.g., 'Skip the narration' or 'Use a more cinematic style')"
            aria-label="Requested changes"
            rows={3}
            className="w-full resize-none rounded-card border border-border bg-bg p-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-border-strong"
          />
          <p className="mt-1 text-xs text-fg-subtle">⌘ + Enter to submit changes</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
          <kbd className="rounded border border-border px-1.5 py-0.5">Enter</kbd>
          run all
        </p>

        <div className="flex items-center gap-2">
          {changesOpen ? (
            <PlanAction
              label="Submit changes"
              disabled={resolving || feedback.trim().length === 0}
              busy={resolving}
              onClick={() => onRequestChanges(feedback.trim())}
            />
          ) : (
            <PlanAction
              label="Request Changes"
              ghost
              disabled={resolving}
              onClick={() => setChangesOpen(true)}
            />
          )}
          <PlanAction
            label="Step by Step"
            ghost
            disabled={resolving}
            onClick={() => onApprove("step_by_step")}
          />
          <PlanAction
            label="Run All"
            icon
            disabled={resolving}
            busy={resolving && !changesOpen}
            onClick={() => onApprove("auto")}
          />
        </div>
      </div>
    </section>
  );
}

/** `◈ ~0.42M` — the reference prefixes estimates with a tilde; totals and steps share the chip. */
function CreditChip({ amount }: { amount: string }) {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-bg px-2 py-0.5 text-xs text-fg-muted">
      <Diamond className="size-3" aria-hidden />~{formatCredits(amount)}
    </span>
  );
}

function PlanAction({
  label,
  ghost = false,
  icon = false,
  busy = false,
  disabled,
  onClick,
}: {
  label: string;
  ghost?: boolean;
  icon?: boolean;
  busy?: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        ghost ? "border border-border text-fg hover:bg-bg" : "bg-fg text-bg hover:opacity-90",
      )}
    >
      {busy ? <Spinner className="size-3.5" /> : icon ? <Play className="size-3.5" aria-hidden /> : null}
      {label}
    </button>
  );
}

/** `Enter` must still type into the composer and the changes box; the shortcut yields to them. */
function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)
  );
}
