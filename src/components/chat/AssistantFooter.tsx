"use client";

import { CircleDollarSign, GitFork, ThumbsDown, ThumbsUp, type LucideIcon } from "lucide-react";
import type { MessageDTO } from "@/contracts";
import { CopyButton } from "@/components/chat/CopyButton";
import { DisabledAction } from "@/components/DisabledAction";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { formatCredits, formatMessageTime } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { useFeedback } from "@/queries/use-feedback";

/**
 * The reference's assistant footer: the turn's credit total, then the action row and the time.
 *
 * Deliberately no token counts. The reference shows them nowhere, and the brief's requirement that a
 * `usage` block render is met by `UsageRow` inside the step group — invisible at rest, because a
 * finished group is collapsed, and reachable when someone expands it.
 */
export function AssistantFooter({ message, chatId }: { message: MessageDTO; chatId: string }) {
  const hydrated = useHydrated();
  const feedback = useFeedback(chatId, message.id);

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
        <FeedbackButton
          icon={ThumbsUp}
          label="Like"
          active={message.feedback === "like"}
          onClick={() => feedback.mutate(message.feedback === "like" ? null : "like")}
        />
        <FeedbackButton
          icon={ThumbsDown}
          label="Dislike"
          active={message.feedback === "dislike"}
          onClick={() => feedback.mutate(message.feedback === "dislike" ? null : "dislike")}
        />
        <span className="text-xs">{hydrated ? formatMessageTime(message.createdAt) : null}</span>
      </div>
    </div>
  );
}

/** A thumb that fills while it is the recorded verdict; pressing it again takes the verdict back. */
function FeedbackButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={cn("transition-colors", active ? "text-fg" : "hover:text-fg")}
      >
        <Icon className={cn("size-3.5", active && "fill-current")} aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{active ? `${label}d — click to undo` : label}</TooltipContent>
    </Tooltip>
  );
}
