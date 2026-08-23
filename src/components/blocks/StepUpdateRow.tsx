import { Check, ClipboardList } from "lucide-react";
import type { BlockProps } from "@/components/blocks/types";

/** `Step update — <key>: <status>`, the plan-progress row the reference shows during step mode. */
export function StepUpdateRow({ block }: BlockProps) {
  if (block.type !== "step_update") return null;

  return (
    <div className="flex items-start gap-2">
      <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-fg-muted" aria-hidden />
      <p className="text-[13px] text-fg">
        Step update — {block.stepKey}: {block.status}
        {block.note && <span className="text-fg-muted"> — {block.note}</span>}
      </p>
      {block.status === "completed" && (
        <Check className="mt-0.5 size-3 shrink-0 text-success" aria-label="Completed" />
      )}
    </div>
  );
}
