"use client";

import { CircleDollarSign, GitFork, ThumbsDown, ThumbsUp } from "lucide-react";
import type { MessageDTO } from "@/contracts";
import { CopyButton } from "@/components/chat/CopyButton";
import { DisabledAction } from "@/components/DisabledAction";
import { formatCredits, formatMessageTime } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";

const FEEDBACK_REASON = "Message feedback isn't wired up in this build yet.";

/** The reference's assistant footer: the turn's credit total, then the action row and the time. */
export function AssistantFooter({ message }: { message: MessageDTO }) {
  const hydrated = useHydrated();

  return (
    <div className="mt-3 flex flex-col gap-2">
      {message.creditUsed !== "0" && (
        <p className="flex items-center gap-1 text-[11px] text-fg-subtle">
          <CircleDollarSign className="size-3" aria-hidden />
          {formatCredits(message.creditUsed)} credits
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
