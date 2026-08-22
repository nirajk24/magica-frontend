"use client";

import type { MessageDTO } from "@/contracts";
import { MessageRow } from "@/components/chat/MessageRow";

export function MessageList({ messages }: { messages: readonly MessageDTO[] }) {
  return (
    <div className="flex flex-col gap-8">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
    </div>
  );
}
