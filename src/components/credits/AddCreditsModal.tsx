"use client";

import { CreditCard, X } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/Spinner";
import { cn } from "@/lib/cn";
import { useTopUp } from "@/queries/use-top-up";
import { useUI } from "@/stores/ui";

/** The reference offers $20/$50/$100/$200; $1 is a million credits, and ours skips the dollars. */
const PRESETS_M = [20, 50, 100, 200] as const;

const MICRO_PER_M = 1_000_000n;

/**
 * The Add Credits modal, mounted once by the shell and opened from the sidebar and the credits
 * popover through one store flag.
 *
 * Same layout as the reference's purchase modal; ours diverges on payment only (D-3): no dollar
 * amounts, no total price, no auto-recharge — a top-up here is free and instant, and the copy says
 * so instead of dressing up as a checkout.
 */
export function AddCreditsModal() {
  const open = useUI((state) => state.addCreditsOpen);
  const setOpen = useUI((state) => state.setAddCreditsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="Add Credits" showTitle={false} className="w-[440px] rounded-2xl p-6">
        <ModalBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ModalBody({ onClose }: { onClose: () => void }) {
  const [millions, setMillions] = useState<number>(PRESETS_M[0]);
  const [custom, setCustom] = useState("");
  const topUp = useTopUp();

  const chosen = custom.trim() === "" ? millions : Number.parseInt(custom, 10);
  const valid = Number.isInteger(chosen) && chosen > 0 && chosen <= 1_000;

  const submit = () => {
    if (!valid || topUp.isPending) return;

    topUp.mutate((BigInt(chosen) * MICRO_PER_M).toString(), { onSuccess: onClose });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Add Credits</h2>
          <p className="mt-1 text-sm text-fg-muted">Top up credits to use across all AI features.</p>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <p className="rounded-card bg-surface px-3 py-2.5 text-sm text-fg-muted">
        Credits are free in this build — a top-up lands instantly.
      </p>

      <div>
        <p className="text-sm font-medium text-fg">Amount</p>
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
          {PRESETS_M.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-pressed={custom === "" && millions === preset}
              onClick={() => {
                setMillions(preset);
                setCustom("");
              }}
              className={cn(
                "rounded-lg py-2 text-sm transition-colors",
                custom === "" && millions === preset
                  ? "bg-panel font-medium text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {preset}M
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="custom-credits" className="text-sm font-medium text-fg">
          Custom amount
        </label>
        <input
          id="custom-credits"
          type="number"
          min={1}
          max={1000}
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder={String(millions)}
          className="mt-2 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-border-strong"
        />
        <p className="mt-1 text-xs text-fg-subtle">In millions of credits, up to 1000M per top-up.</p>
      </div>

      <div className="rounded-xl bg-surface px-4 py-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5 text-sm">
          <span className="text-fg-muted">Credits</span>
          <span className="text-fg">{valid ? `${chosen}M` : "—"}</span>
        </div>
        <div className="flex items-center justify-between pt-2.5">
          <span className="text-sm text-fg-muted">Total</span>
          <span className="text-lg font-semibold text-fg">{valid ? `${chosen}M credits` : "—"}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="h-10 rounded-full px-4 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!valid || topUp.isPending}
          onClick={submit}
          className="flex h-10 items-center gap-2 rounded-full bg-fg px-5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {topUp.isPending ? <Spinner className="size-4" /> : <CreditCard className="size-4" aria-hidden />}
          Add Credits
        </button>
      </div>
    </div>
  );
}
