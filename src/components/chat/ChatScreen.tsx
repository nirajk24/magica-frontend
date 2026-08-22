"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import type { ActiveRun, MessageDTO } from "@/contracts";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { MessageList, type TranscriptItem } from "@/components/chat/MessageList";
import { ToolDetailPanel } from "@/components/panels/ToolDetailPanel";
import { EmptyStateHeader } from "@/components/shell/EmptyStateHeader";
import { TemplateGallery } from "@/components/shell/TemplateGallery";
import { RadialSpinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api-client";
import { useActiveRun } from "@/queries/use-active-run";
import { useStopRun } from "@/queries/use-cancel-run";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { findToolView } from "@/lib/timeline";
import { useLlmStatus } from "@/queries/use-llm-status";
import { sendFailureMessage, useSendMessage } from "@/queries/use-send-message";
import { useUI } from "@/stores/ui";

const COLUMN = "mx-auto w-full max-w-[820px] px-6";

/**
 * The new-chat screen runs wider than a conversation: 900px against 820px, measured off the
 * reference at two very different viewport widths, so it is a fixed maximum rather than a fraction.
 */
const EMPTY_STATE_COLUMN = "mx-auto w-full max-w-[900px] px-6";

/**
 * The chat screen, in both of its layouts.
 *
 * A chat that does not exist yet has no transcript to scroll, so the composer centres in the column
 * the way the reference's `/chat` does; an existing chat pins it below the message list.
 *
 * An anonymous visitor gets the same screen. Sending asks for an account instead of calling the API,
 * and because the draft lives in the UI store it is still there when they come back signed in.
 *
 * While a run is active its persisted row is filtered out of the transcript and `LiveRun` owns the
 * rendering, so the same content is never on screen twice.
 *
 * The tool detail panel is rendered here rather than by the card that opens it: cards live inside the
 * virtualizer and unmount as soon as they scroll out of view, which would take an open panel with
 * them. The store carries only the invocation id, and the invocation is read back from the messages.
 */
export function ChatScreen({ chatId }: { chatId: string }) {
  const isNew = chatId === NEW_CHAT_ID;
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const activeRun = useActiveRun(chatId).data ?? null;
  const { query, messages } = useChatTranscript(chatId, activeRun?.runId ?? null);
  const live = liveRunToRender(activeRun, messages);
  const send = useSendMessage(chatId);
  const setDraft = useUI((state) => state.setDraft);
  const openPanel = useUI((state) => state.openPanel);
  const setOpenPanel = useUI((state) => state.setOpenPanel);
  const stop = useStopRun(chatId, activeRun?.runId ?? null, activeRun === null && !query.isFetching);
  const [optimistic, setOptimistic] = useState<{ chatId: string; message: MessageDTO } | null>(
    null,
  );
  const pending = optimistic?.chatId === chatId ? optimistic.message : null;

  const submit = (submission: ComposerSubmit) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setOptimistic({ chatId, message: optimisticUserMessage(submission.content) });
    send.mutate(submission, { onSettled: () => setOptimistic(null) });
  };

  const failure = send.isError ? sendFailureMessage(send.error) : null;

  /**
   * A send that has been accepted but has no run to render yet. The reference shows the turn the
   * instant the message lands, so this cannot wait for dispatch — see `PendingTurn`.
   */
  const awaitingRun = live === null && (send.isPending || pending !== null);


  const rateLimited = Boolean(useLlmStatus().data?.rateLimitedUntil);
  const panelTool = openPanel ? findToolView(messages, openPanel.invocationId) : null;

  const items = useMemo<TranscriptItem[]>(() => {
    const rows: TranscriptItem[] = [...messages, ...(pending ? [pending] : [])].map((message) => ({
      kind: "message",
      message,
    }));

    if (live) return [...rows, { kind: "live", chatId, run: live }];

    return awaitingRun ? [...rows, { kind: "pending" }] : rows;
  }, [messages, pending, live, chatId, awaitingRun]);

  /** The masthead and templates give way the moment there is a turn to show. */
  const showEmptyState = isNew && items.length === 0;

  return (
    <div className="flex h-full flex-col">
      {!showEmptyState && (
        <div className="min-h-0 flex-1">
          {!isNew && query.isPending ? (
            <FullColumnSpinner />
          ) : !isNew && query.isError ? (
            <LoadFailure error={query.error} />
          ) : (
            <MessageList
              items={items}
              runActive={activeRun !== null}
              onStartReached={() => {
                if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
              }}
            />
          )}
        </div>
      )}

      <div className={showEmptyState ? "min-h-0 flex-1 overflow-y-auto pt-28 pb-10" : "shrink-0 pb-6"}>
        <div className={showEmptyState ? EMPTY_STATE_COLUMN : COLUMN}>
          {showEmptyState && <EmptyStateHeader />}

          <Composer
            chatId={chatId}
            runActive={activeRun !== null}
            stopping={stop.stopping}
            placeholder={isNew ? "Assign a task or ask anything..." : "Send a message..."}
            pending={send.isPending}
            onSubmit={submit}
            onStop={stop.stop}
          />

          {rateLimited && !failure && (
            <p role="status" className="mt-2 px-1 text-sm text-amber">
              The free model path is rate limited right now. Sending will likely fail — try again
              shortly.
            </p>
          )}

          {failure && (
            <p role="alert" className="mt-2 px-1 text-sm text-danger">
              {failure.text}
              {failure.traceId && (
                <span className="ml-2 font-mono text-xs text-fg-subtle">{failure.traceId}</span>
              )}
            </p>
          )}

          {showEmptyState && (
            <TemplateGallery onPick={(template) => setDraft(chatId, template.prompt)} />
          )}
        </div>
      </div>

      {panelTool && <ToolDetailPanel tool={panelTool} onClose={() => setOpenPanel(null)} />}
    </div>
  );
}

/**
 * The run the overlay should render, or `null`.
 *
 * A run with no `triggerRunId` yet is still returned: that id is Trigger.dev's and arrives seconds
 * after the send is accepted, so gating the row on it left the screen empty for that whole window.
 * `LiveRun` subscribes only once the id exists and shows a pending row until then.
 *
 * INVARIANT: the overlay gives way only once the assistant row it was previewing has actually landed
 * in the cache. Unmounting when the run goes terminal instead would blank the turn for however long
 * the refetch takes, and unmounting later would show the same content twice.
 */
function liveRunToRender(activeRun: ActiveRun | null, messages: readonly MessageDTO[]) {
  if (!activeRun) return null;

  const settled = messages.some(
    (message) => message.id === activeRun.assistantMessageId && message.status !== "streaming",
  );

  return settled ? null : activeRun;
}

/**
 * The bubble shown between pressing Enter and the server confirming.
 *
 * It is deliberately not a `MessageDTO` from the cache — see `useSendMessage`. The id is a local
 * marker and never reaches the server. It is held against the chat it was typed into, because
 * `/chat` sends and then replaces the route: React may keep this component, and an unkeyed bubble
 * would sit beside the real message for a render.
 */
function optimisticUserMessage(content: string): MessageDTO {
  return {
    id: "optimistic-user-message",
    role: "user",
    status: "success",
    content,
    contentBlocks: null,
    attachments: null,
    assets: null,
    toolInvocations: [],
    aiModel: null,
    tokenUsage: null,
    creditUsed: "0",
    feedback: null,
    errorMessage: null,
    metadata: null,
    runId: null,
    createdAt: new Date().toISOString(),
  };
}

/** The transcript's wait is the same wait as the app's, so it wears the same indicator. */
function FullColumnSpinner() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <RadialSpinner />
    </div>
  );
}

function LoadFailure({ error }: { error: unknown }) {
  const apiError = error instanceof ApiError ? error : null;
  const notFound = apiError?.code === "NOT_FOUND";

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-fg">
        {notFound ? "This task doesn't exist, or isn't yours." : "This task couldn't be loaded."}
      </p>
      {apiError && !notFound && (
        <p className="text-sm text-fg-muted">
          {apiError.message} <span className="font-mono text-xs">{apiError.traceId}</span>
        </p>
      )}
    </div>
  );
}
