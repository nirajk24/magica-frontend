"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { ActiveRun, MessageDTO } from "@/contracts";
import { LiveRun } from "@/components/chat/LiveRun";
import { MessageRow } from "@/components/chat/MessageRow";
import { PendingTurn } from "@/components/chat/PendingTurn";
import { ScrollToBottom } from "@/components/chat/ScrollToBottom";
import { cn } from "@/lib/cn";

const COLUMN = "mx-auto w-full max-w-[880px] px-6";

/**
 * A row of the transcript: a stored message, or the run currently being written.
 *
 * The live run is a list item rather than something rendered beneath the list, so it scrolls with the
 * conversation and the virtualizer owns one scroller instead of two.
 */
export type TranscriptItem =
  | { kind: "message"; message: MessageDTO }
  | { kind: "live"; chatId: string; run: ActiveRun }
  | { kind: "pending" }
  /** The plan awaiting approval. A transcript row, so it ends the conversation instead of floating over it. */
  | { kind: "plan" };

/**
 * The virtualized message list the brief asks for by name.
 *
 * `startReached` walks the cursor backwards through history, which is how the reference pages — it
 * shows no "load older" control anywhere.
 *
 * The jump-to-latest button lives inside this container rather than beside the composer, because the
 * only thing that knows whether the transcript is scrolled up is the scroller itself.
 */
export function MessageList({
  items,
  chatId,
  runActive = false,
  onStartReached,
  planCard,
}: {
  items: readonly TranscriptItem[];
  /** The conversation on screen; rows need it to write back into the right cache. */
  chatId: string;
  runActive?: boolean;
  onStartReached?: () => void;
  /** Rendered for the `plan` row. Built by the screen, which owns the resolve mutation. */
  planCard?: ReactNode;
}) {
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);

  /**
   * Whether an arriving row should animate in.
   *
   * `itemContent` re-runs whenever a row scrolls back into view, so this cannot be derived from
   * arrival without the class being pulled mid-animation. It is gated on first paint instead: a
   * reload renders the whole transcript at rest, and anything mounting afterwards fades in.
   *
   * The trade-off is that scrolling a row out of view and back replays its entrance. That reads as
   * a reveal rather than a glitch, and it is worth it to stop twenty messages cascading on load.
   */
  const [entrances, setEntrances] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntrances(true));

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative h-full">
      <Virtuoso
        ref={virtuoso}
        className="h-full"
        data={items as TranscriptItem[]}
        computeItemKey={(_index, item) => keyFor(item)}
        initialTopMostItemIndex={Math.max(items.length - 1, 0)}
        followOutput={(isAtBottom) => (isAtBottom ? "auto" : false)}
        atBottomStateChange={setAtBottom}
        startReached={onStartReached}
        itemContent={(_index, item) => (
          <div
            className={cn(
              `${COLUMN} py-4`,
              entrances && "animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out",
            )}
          >
            {item.kind === "message" ? (
              <MessageRow message={item.message} chatId={chatId} runActive={runActive} />
            ) : item.kind === "pending" ? (
              <PendingTurn />
            ) : item.kind === "plan" ? (
              planCard
            ) : (
              <LiveRun
                key={`${item.run.triggerRunId}:${item.run.publicAccessToken}`}
                chatId={item.chatId}
                run={item.run}
              />
            )}
          </div>
        )}
      />

      <ScrollToBottom
        visible={!atBottom}
        onClick={() =>
          virtuoso.current?.scrollToIndex({
            index: Math.max(items.length - 1, 0),
            align: "end",
            behavior: "smooth",
          })
        }
      />
    </div>
  );
}

function keyFor(item: TranscriptItem): string {
  if (item.kind === "message") return item.message.id;
  if (item.kind === "live") return `live:${item.run.runId}`;

  return item.kind;
}
