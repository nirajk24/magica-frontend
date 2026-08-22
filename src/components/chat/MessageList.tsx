"use client";

import { useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { ActiveRun, MessageDTO } from "@/contracts";
import { LiveRun } from "@/components/chat/LiveRun";
import { MessageRow } from "@/components/chat/MessageRow";
import { PendingTurn } from "@/components/chat/PendingTurn";
import { ScrollToBottom } from "@/components/chat/ScrollToBottom";

const COLUMN = "mx-auto w-full max-w-[820px] px-6";

/**
 * A row of the transcript: a stored message, or the run currently being written.
 *
 * The live run is a list item rather than something rendered beneath the list, so it scrolls with the
 * conversation and the virtualizer owns one scroller instead of two.
 */
export type TranscriptItem =
  | { kind: "message"; message: MessageDTO }
  | { kind: "live"; chatId: string; run: ActiveRun }
  | { kind: "pending" };

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
  runActive = false,
  onStartReached,
}: {
  items: readonly TranscriptItem[];
  runActive?: boolean;
  onStartReached?: () => void;
}) {
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);

  return (
    <div className="relative h-full">
      <Virtuoso
        ref={virtuoso}
        className="h-full"
        data={items as TranscriptItem[]}
        computeItemKey={(_index, item) => keyFor(item)}
        initialTopMostItemIndex={Math.max(items.length - 1, 0)}
        followOutput={(isAtBottom) => (isAtBottom ? "smooth" : false)}
        atBottomStateChange={setAtBottom}
        startReached={onStartReached}
        itemContent={(_index, item) => (
          <div className={`${COLUMN} py-4`}>
            {item.kind === "message" ? (
              <MessageRow message={item.message} runActive={runActive} />
            ) : item.kind === "pending" ? (
              <PendingTurn />
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

  return item.kind === "pending" ? "pending" : `live:${item.run.runId}`;
}
