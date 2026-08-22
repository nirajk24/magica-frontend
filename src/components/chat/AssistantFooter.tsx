"use client";

import { CircleDollarSign, GitFork, ThumbsDown, ThumbsUp } from "lucide-react";
import type { MessageDTO } from "@/contracts";
import { CopyButton } from "@/components/chat/CopyButton";
import { DisabledAction } from "@/components/DisabledAction";
import { formatCredits, formatMessageTime, formatTokens } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";

const FEEDBACK_REASON = "Message feedback isn't wired up in this build yet.";

/**
 * The reference's assistant footer: the turn's credit total, then the action row and the time.
 *
 * Token counts are a documented divergence. The brief requires a `usage` content block to render, the
 * reference shows tokens nowhere, and inside the step group they disappear when it collapses — so
 * they sit here, muted, where they are always readable.
 */
export function AssistantFooter({ message }: { message: MessageDTO }) {
  const hydrated = useHydrated();

  return (
    <div className="mt-3 flex flex-col gap-2">
      {(message.creditUsed !== "0" || message.tokenUsage) && (
        <p className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
          {message.creditUsed !== "0" && (
            <span className="flex items-center gap-1">
              <CircleDollarSign className="size-3" aria-hidden />
              {formatCredits(message.creditUsed)} credits
            </span>
          )}
          {message.tokenUsage && (
            <span>
              {formatTokens(message.tokenUsage.inputTokens)} in ·{" "}
              {formatTokens(message.tokenUsage.outputTokens)} out
            </span>
          )}
        </p>
      )}

      <div className="flex items-center gap-3 text-fg-subtle">
        <CopyButton text={message.content} />
        <DisabledAction
          icon={GitFork}
          label="Branch from here"
          reason="Branching a conversation isn't part of this build."
        />
        <DisabledAction icon={ThumbsUp} label="Like" reason={FEEDBACK_REASON} />
        <DisabledAction icon={ThumbsDown} label="Dislike" reason={FEEDBACK_REASON} />
        <span className="text-xs">{hydrated ? formatMessageTime(message.createdAt) : null}</span>
      </div>
    </div>
  );
}
