"use client";

import { useMemo } from "react";
import type { MessageDTO } from "@/contracts";
import { AssetStrip } from "@/components/chat/AssetStrip";
import { AssistantFooter } from "@/components/chat/AssistantFooter";
import { AttachmentGallery } from "@/components/chat/AttachmentGallery";
import { CopyButton } from "@/components/chat/CopyButton";
import { MessageTimeline } from "@/components/chat/MessageTimeline";
import { TurnOutcome } from "@/components/chat/TurnOutcome";
import { formatMessageTime } from "@/lib/format";
import { timelineFromMessage } from "@/lib/timeline";
import { useHydrated } from "@/lib/use-hydrated";
import { useRetryMessage } from "@/queries/use-retry-message";

export function MessageRow({
  message,
  chatId,
  runActive = false,
}: {
  message: MessageDTO;
  /** The conversation the row belongs to — feedback patches this chat's cache optimistically. */
  chatId: string;
  /** Retry is refused while another run holds the chat, so the control says so instead of failing. */
  runActive?: boolean;
}) {
  return message.role === "user" ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} chatId={chatId} runActive={runActive} />
  );
}

function UserMessage({ message }: { message: MessageDTO }) {
  const hydrated = useHydrated();

  return (
    <div className="group flex flex-col items-end gap-1.5">
      <div className="max-w-[80%] rounded-bubble bg-surface px-4 py-3 text-base leading-7 text-fg">
        {message.attachments && <AttachmentGallery attachments={message.attachments} />}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      <div className="flex items-center gap-2 text-xs text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <span>{hydrated ? formatMessageTime(message.createdAt) : null}</span>
        <CopyButton text={message.content} />
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  chatId,
  runActive,
}: {
  message: MessageDTO;
  chatId: string;
  runActive: boolean;
}) {
  const timeline = useMemo(() => timelineFromMessage(message), [message]);
  const hasBlocks = timeline.segments.length > 0;
  const retry = useRetryMessage();

  return (
    <div className="flex flex-col">
      {hasBlocks ? (
        <MessageTimeline timeline={timeline} timelineId={message.id} />
      ) : (
        <p className="text-base leading-7 whitespace-pre-wrap text-fg">{message.content}</p>
      )}

      {message.assets && <AssetStrip assets={message.assets} />}

      <TurnOutcome
        message={message}
        runActive={runActive}
        retrying={retry.isPending}
        onRetry={retry.mutate}
      />

      <AssistantFooter message={message} chatId={chatId} />
    </div>
  );
}
