"use client";

import { Virtuoso } from "react-virtuoso";
import type { ActiveRun, MessageDTO } from "@/contracts";
import { LiveRun } from "@/components/chat/LiveRun";
import { MessageRow } from "@/components/chat/MessageRow";

const COLUMN = "mx-auto w-full max-w-[820px] px-6";

/**
 * A row of the transcript: a stored message, or the run currently being written.
 *
 * The live run is a list item rather than something rendered beneath the list, so it scrolls with the
 * conversation and the virtualizer owns one scroller instead of two.
 */
export type TranscriptItem =
  | { kind: "message"; message: MessageDTO }
  | { kind: "live"; chatId: string; run: ActiveRun };

/**
 * The virtualized message list the brief asks for by name.
 *
 * `startReached` walks the cursor backwards through history, which is how the reference pages — it
 * shows no "load older" control anywhere.
 */
export function MessageList({
  items,
  onStartReached,
}: {
  items: readonly TranscriptItem[];
  onStartReached?: () => void;
}) {
  return (
    <Virtuoso
      className="h-full"
      data={items as TranscriptItem[]}
      computeItemKey={(_index, item) => keyFor(item)}
      initialTopMostItemIndex={Math.max(items.length - 1, 0)}
      followOutput={(isAtBottom) => (isAtBottom ? "smooth" : false)}
      startReached={onStartReached}
      itemContent={(_index, item) => (
        <div className={`${COLUMN} py-4`}>
          {item.kind === "message" ? (
            <MessageRow message={item.message} />
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
  );
}

function keyFor(item: TranscriptItem): string {
  return item.kind === "message" ? item.message.id : `live:${item.run.runId}`;
}
