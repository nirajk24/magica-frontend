"use client";

import { useMemo } from "react";
import type { MessageDTO } from "@/contracts";
import { AssetStrip } from "@/components/chat/AssetStrip";
import { AssistantFooter } from "@/components/chat/AssistantFooter";
import { AttachmentGallery } from "@/components/chat/AttachmentGallery";
import { CopyButton } from "@/components/chat/CopyButton";
import { MessageTimeline } from "@/components/chat/MessageTimeline";
import { formatMessageTime } from "@/lib/format";
import { timelineFromMessage } from "@/lib/timeline";
import { useHydrated } from "@/lib/use-hydrated";

export function MessageRow({ message }: { message: MessageDTO }) {
  return message.role === "user" ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage message={message} />
  );
}

function UserMessage({ message }: { message: MessageDTO }) {
  const hydrated = useHydrated();

  return (
    <div className="group flex flex-col items-end gap-1.5">
      <div className="max-w-[80%] rounded-bubble bg-surface px-4 py-2.5 text-[15px] leading-6 text-fg">
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

function AssistantMessage({ message }: { message: MessageDTO }) {
  const timeline = useMemo(() => timelineFromMessage(message), [message]);
  const hasBlocks = timeline.segments.length > 0;

  return (
    <div className="flex flex-col">
      {hasBlocks ? (
        <MessageTimeline timeline={timeline} />
      ) : (
        <p className="text-[15px] leading-7 whitespace-pre-wrap text-fg">{message.content}</p>
      )}

      {message.assets && <AssetStrip assets={message.assets} />}

      <AssistantFooter message={message} />
    </div>
  );
}
