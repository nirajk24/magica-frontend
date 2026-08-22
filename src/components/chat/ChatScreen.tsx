"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useState } from "react";
import type { MessageDTO } from "@/contracts";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { LiveRun } from "@/components/chat/LiveRun";
import { MessageList } from "@/components/chat/MessageList";
import { Spinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api-client";
import { useActiveRun } from "@/queries/use-active-run";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { sendFailureMessage, useSendMessage } from "@/queries/use-send-message";

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
  const send = useSendMessage(chatId);
  const [optimistic, setOptimistic] = useState<MessageDTO | null>(null);

  const submit = (submission: ComposerSubmit) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setOptimistic(optimisticUserMessage(submission.content));
    send.mutate(submission, { onSettled: () => setOptimistic(null) });
  };

  const failure = send.isError ? sendFailureMessage(send.error) : null;
  const transcript = optimistic ? [...messages, optimistic] : messages;

  return (
    <div className="flex h-dvh flex-col">
      {!isNew && (
        <div className="flex-1 overflow-y-auto">
          <div className={`${COLUMN} py-10`}>
            {query.isPending ? (
              <FullColumnSpinner />
            ) : query.isError ? (
              <LoadFailure error={query.error} />
            ) : (
              <>
                {query.hasNextPage && <LoadOlder query={query} />}
                <MessageList messages={transcript} />

                {activeRun?.triggerRunId && (
                  <div className="mt-8">
                    <LiveRun
                      key={`${activeRun.triggerRunId}:${activeRun.publicAccessToken}`}
                      chatId={chatId}
                      run={activeRun}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className={isNew ? "flex flex-1 items-center pb-24" : "shrink-0 pb-6"}>
        <div className={COLUMN}>
          <Composer
            chatId={chatId}
            variant={isNew ? "new-chat" : "conversation"}
            runActive={activeRun !== null}
            placeholder={isNew ? "Assign a task or ask anything..." : "Send a message..."}
            pending={send.isPending}
            onSubmit={submit}
          />

          {failure && (
            <p role="alert" className="mt-2 px-1 text-sm text-danger">
              {failure.text}
              {failure.traceId && (
                <span className="ml-2 font-mono text-xs text-fg-subtle">{failure.traceId}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The bubble shown between pressing Enter and the server confirming.
 *
 * It is deliberately not a `MessageDTO` from the cache — see `useSendMessage`. The id is a local
 * marker and never reaches the server.
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

function LoadOlder({ query }: { query: ReturnType<typeof useChatTranscript>["query"] }) {
  return (
    <button
      type="button"
      onClick={() => query.fetchNextPage()}
      disabled={query.isFetchingNextPage}
      className="mx-auto mb-8 block rounded-card px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:opacity-60"
    >
      {query.isFetchingNextPage ? "Loading…" : "Load older messages"}
    </button>
  );
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
