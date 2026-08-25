"use client";

import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCredits } from "@/queries/use-credits";
import { formatCredits } from "@/lib/format";
import { useUI } from "@/stores/ui";

/**
 * What the reference's purchase modal becomes without a payment provider behind it.
 *
 * It used to grant credits on request. That endpoint was authenticated but took any positive
 * integer, so the modal's own presets — 20 to 1000 credits against a real balance of 27 — were an
 * invitation to mint currency. Removed rather than capped: a demo has a fixed allowance, and saying
 * so is more honest than a checkout that isn't one.
 */
export function AddCreditsModal() {
  const open = useUI((state) => state.addCreditsOpen);
  const setOpen = useUI((state) => state.setAddCreditsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent title="Credits" showTitle={false} className="w-[440px] rounded-2xl p-6">
        <ModalBody onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ModalBody({ onClose }: { onClose: () => void }) {
  const { data } = useCredits();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">Credits</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Every account gets a fixed allowance in this build.
          </p>
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

      {data && (
        <div className="rounded-card bg-surface px-3 py-2.5">
          <p className="text-sm text-fg-muted">Remaining</p>
          <p className="mt-0.5 text-2xl font-semibold text-fg">{formatCredits(data.balance)}</p>
        </div>
      )}

      <p className="text-sm leading-6 text-fg-muted">
        Credits are spent per tool call, never per message — talking costs nothing. There is no
        purchase here because there is no payment provider behind it; the allowance is what the demo
        runs on.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
      >
        Got it
      </button>
    </div>
  );
}
