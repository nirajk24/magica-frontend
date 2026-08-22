"use client";

import { Info, RotateCcw, TriangleAlert } from "lucide-react";
import type { MessageDTO } from "@/contracts";
import { Spinner } from "@/components/Spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

const INTERRUPTED = "Response was interrupted";

/**
 * How a turn that did not finish explains itself: a full-width row between the step timeline and the
 * footer, so the partial output and the tool outcomes above it stay exactly where they were.
 *
 * The interrupted state is derived from `status`, never from a `"(Response stopped)"` suffix in the
 * content — the reference's API appends one, and rendering it would put words in the transcript that
 * the user never typed.
 *
 * `Retry` has no counterpart in the reference, whose user simply sent the message again. It is here
 * because the brief requires a failed or cancelled turn to be retryable, and it sits at the row's
 * far end so the captured left-hand side is unchanged.
 */
export function TurnOutcome({
  message,
  runActive,
  retrying,
  onRetry,
}: {
  message: MessageDTO;
  runActive: boolean;
  retrying: boolean;
  onRetry?: (messageId: string) => void;
}) {
  if (message.status !== "failed" && message.status !== "cancelled") return null;

  const failed = message.status === "failed";
  const Icon = failed ? TriangleAlert : Info;

  return (
    <div
      className={cn(
        "mt-3 flex items-start gap-2 rounded-card border px-3 py-2",
        failed ? "border-danger/40" : "border-border",
      )}
    >
      <Icon
        className={cn("mt-1 size-4 shrink-0", failed ? "text-danger" : "text-fg-subtle")}
        aria-hidden
      />

      <p
        className={cn(
          "min-w-0 flex-1 text-[15px] leading-6",
          failed ? "text-danger" : "text-fg-subtle",
        )}
      >
        {failed ? (message.errorMessage ?? "This response failed to finish.") : INTERRUPTED}
      </p>

      <RetryButton
        messageId={message.id}
        runActive={runActive}
        retrying={retrying}
        onRetry={onRetry}
      />
    </div>
  );
}

function RetryButton({
  messageId,
  runActive,
  retrying,
  onRetry,
}: {
  messageId: string;
  runActive: boolean;
  retrying: boolean;
  onRetry?: (messageId: string) => void;
}) {
  const blocked = runActive || retrying;

  const button = (
    <button
      type="button"
      aria-disabled={blocked}
      aria-busy={retrying}
      onClick={() => {
        if (!blocked) onRetry?.(messageId);
      }}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-fg transition-colors",
        blocked ? "cursor-not-allowed opacity-60" : "hover:bg-surface",
      )}
    >
      {retrying ? (
        <Spinner className="size-3 text-current" />
      ) : (
        <RotateCcw className="size-3" aria-hidden />
      )}
      Retry
    </button>
  );

  if (!runActive) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>Another run is already in progress in this task.</TooltipContent>
    </Tooltip>
  );
}
