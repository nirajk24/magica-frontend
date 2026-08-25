"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import type { ChatWithMessages } from "@/contracts";
import { MessageList, type TranscriptItem } from "@/components/chat/MessageList";

/**
 * One example conversation, read only.
 *
 * The transcript is the same `MessageList` a real chat renders, because the fixture is a real
 * `ChatWithMessages` — the renderers take DTOs, so an example goes through the identical path
 * rather than a parallel one that can drift from it.
 *
 * The composer is replaced rather than disabled. A disabled input still looks like somewhere to
 * type, which is exactly the moment someone wonders whether they are about to message a stranger.
 */
export function ExampleScreen({ example }: { example: ChatWithMessages }) {
  const { isSignedIn } = useAuth();

  // Same column the composer occupies in a real chat, so the two screens line up.
  const column = "mx-auto w-full max-w-[940px] px-6";

  const items = useMemo<TranscriptItem[]>(
    () => example.messages.map((message) => ({ kind: "message", message })),
    [example.messages],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <MessageList
          items={items}
          chatId={example.chat.id}
          planCard={null}
          runActive={false}
          onStartReached={() => {}}
        />
      </div>

      <div className="shrink-0 pb-6">
        <div className={column}>
          <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-panel px-4 py-3.5">
            <p className="flex items-center gap-2.5 text-sm text-fg-muted">
              <BookOpen className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              An example conversation, to show what this does.
            </p>

            <Link
              href={isSignedIn ? "/chat" : "/sign-in"}
              className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
            >
              {isSignedIn ? "Start your own" : "Sign in to start your own"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
