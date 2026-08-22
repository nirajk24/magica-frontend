"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import type { ActiveRun, MessageDTO } from "@/contracts";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { MessageList, type TranscriptItem } from "@/components/chat/MessageList";
import { EmptyStateHeader } from "@/components/shell/EmptyStateHeader";
import { TemplateGallery } from "@/components/shell/TemplateGallery";
import { Spinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api-client";
import { useActiveRun } from "@/queries/use-active-run";
import { useStopRun } from "@/queries/use-cancel-run";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { sendFailureMessage, useSendMessage } from "@/queries/use-send-message";
import { useUI } from "@/stores/ui";

const COLUMN = "mx-auto w-full max-w-[820px] px-6";

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

  const items = useMemo<TranscriptItem[]>(() => {
    const rows: TranscriptItem[] = [...messages, ...(pending ? [pending] : [])].map((message) => ({
      kind: "message",
      message,
    }));

    return live ? [...rows, { kind: "live", chatId, run: live }] : rows;
  }, [messages, pending, live, chatId]);

  return (
    <div className="flex h-full flex-col">
      {!isNew && (
        <div className="min-h-0 flex-1">
          {query.isPending ? (
            <FullColumnSpinner />
          ) : query.isError ? (
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

      <div className={isNew ? "min-h-0 flex-1 overflow-y-auto py-10" : "shrink-0 pb-6"}>
        <div className={COLUMN}>
          {isNew && <EmptyStateHeader />}

          <Composer
            chatId={chatId}
            runActive={activeRun !== null}
            stopping={stop.stopping}
            placeholder={isNew ? "Assign a task or ask anything..." : "Send a message..."}
            pending={send.isPending}
            onSubmit={submit}
            onStop={stop.stop}
          />

          {failure && (
            <p role="alert" className="mt-2 px-1 text-sm text-danger">
              {failure.text}
              {failure.traceId && (
                <span className="ml-2 font-mono text-xs text-fg-subtle">{failure.traceId}</span>
              )}
            </p>
          )}

          {isNew && <TemplateGallery onPick={(template) => setDraft(chatId, template.prompt)} />}
        </div>
      </div>
    </div>
  );
}

/**
 * The run the overlay should render, or `null`.
 *
 * INVARIANT: the overlay gives way only once the assistant row it was previewing has actually landed
 * in the cache. Unmounting when the run goes terminal instead would blank the turn for however long
 * the refetch takes, and unmounting later would show the same content twice.
 */
function liveRunToRender(activeRun: ActiveRun | null, messages: readonly MessageDTO[]) {
  if (!activeRun?.triggerRunId) return null;

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

function FullColumnSpinner() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Spinner className="size-5" />
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
