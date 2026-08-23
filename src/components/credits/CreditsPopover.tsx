"use client";

import { BarChart3, CreditCard } from "lucide-react";
import { DisabledAction } from "@/components/DisabledAction";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CREDIT_DIGITS, formatCredits } from "@/lib/format";
import { useCredits } from "@/queries/use-credits";
import { useUI } from "@/stores/ui";

/**
 * The credits popover, anchored under the top bar's chip. Same anatomy as the reference's —
 * plan label, balance row, the solid Add Credits button, the green renewal line — minus payment
 * (D-3): no upgrade plan, no billing details, and the plan label reads what our account actually is.
 * `View usage` stays visible and disabled: the usage dashboard needs a per-tool aggregation the
 * backend does not serve yet. The plan block sits on an inset rounded panel inside the popover —
 * the reference's two-level card, same trick as the palette and the preview column.
 */
export function CreditsPopover() {
  const { data } = useCredits();
  const setAddCreditsOpen = useUI((state) => state.setAddCreditsOpen);

  return (
    <Popover>
      <PopoverTrigger
        aria-label="Available credits"
        className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-panel px-3 text-sm font-medium text-fg transition-colors hover:bg-surface"
      >
        <CreditsSpark className="size-4" />
        {data ? formatCredits(data.balance, CREDIT_DIGITS.balance) : "—"}
      </PopoverTrigger>

      <PopoverContent className="w-[310px] rounded-2xl p-2.5">
        <div className="rounded-xl bg-panel-inset p-3.5">
          <p className="text-xs font-medium tracking-wide text-fg-subtle">FREE TIER</p>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-fg-muted">Available Credits</span>
            <span className="text-lg font-semibold text-fg">
              {data ? formatCredits(data.balance, CREDIT_DIGITS.balance) : "—"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setAddCreditsOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            <CreditCard className="size-4" aria-hidden />
            Add Credits
          </button>

          <p className="mt-3 text-xs text-success">Free tier — credits do not renew</p>
        </div>

        <div className="flex px-1 pt-2.5 pb-0.5">
          <DisabledAction
            icon={BarChart3}
            label="View usage"
            reason="The usage dashboard isn't part of this build yet."
            className="flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm"
            showLabel
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * The chip's glyph: a tilted four-point spark with two short trailing dashes, drawn to the zoomed
 * reference — it is not lucide's rocket, and not a plain sparkle either.
 */
function CreditsSpark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 4.5 16.6 8.4 20.5 10 16.6 11.6 15 15.5 13.4 11.6 9.5 10 13.4 8.4 Z" />
      <path d="M4 15.5h4M6.5 19h4" />
    </svg>
  );
}
