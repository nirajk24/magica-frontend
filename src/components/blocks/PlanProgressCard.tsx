"use client";

import { Check } from "lucide-react";
import { ActivePlan } from "@/contracts";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/cn";
import { formatCredits } from "@/lib/format";

/**
 * The plan-progress tracker: title, an `n/m` counter, a thin accent bar, then one row per step —
 * green check with its completion note, an accent spinner, or an empty box — each with the server's
 * credit estimate right-aligned.
 *
 * It renders from `Chat.activePlan`, the source that survives turns and reloads. Step-by-step turns
 * end after every step, and the chat refetches when a turn settles, so the card advances without a
 * realtime feed of its own.
 */
export function PlanProgressCard({ plan }: { plan: ActivePlan }) {
  const done = plan.steps.filter((step) => step.status === "completed").length;

  return (
    <section aria-label="Plan progress" className="rounded-card border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-[15px] font-semibold text-fg">{plan.title}</h3>
        <span className="shrink-0 text-sm text-fg-muted">
          {done}/{plan.steps.length}
        </span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg" aria-hidden>
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${(done / plan.steps.length) * 100}%` }}
        />
      </div>

      <ul className="mt-3 flex flex-col gap-2.5">
        {plan.steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2.5">
            <StepGlyph status={step.status} />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm",
                  step.status === "completed" ? "text-fg-muted" : "text-fg",
                )}
              >
                {step.title}
              </span>
              {step.note && <span className="block text-xs text-fg-subtle">{step.note}</span>}
            </span>
            <span className="shrink-0 text-xs text-fg-subtle">
              {formatCredits(step.estimatedCredits)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One glyph per state, never colour alone — the status also reads from the label style and note. */
function StepGlyph({ status }: { status: ActivePlan["steps"][number]["status"] }) {
  if (status === "completed") {
    return (
      <span
        aria-label="Completed"
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-success text-bg"
      >
        <Check className="size-3 animate-in zoom-in-90 fade-in duration-200 ease-out" aria-hidden />
      </span>
    );
  }

  if (status === "in_progress") {
    return (
      <span aria-label="In progress" className="mt-0.5 shrink-0">
        <Spinner className="size-4 text-accent" />
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span
        aria-label="Failed"
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-danger text-bg text-[10px]"
      >
        ✕
      </span>
    );
  }

  return (
    <span
      aria-label="Pending"
      className="mt-0.5 size-4 shrink-0 rounded-[5px] border border-border-strong"
    />
  );
}
