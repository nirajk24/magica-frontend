"use client";

import { useState } from "react";
import type { MessageDTO } from "@/contracts";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { MessageList } from "@/components/chat/MessageList";
import { Spinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api-client";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { sendFailureMessage, useSendMessage } from "@/queries/use-send-message";

const COLUMN = "mx-auto w-full max-w-[820px] px-6";

export function ChatScreen({ chatId }: { chatId: string }) {
  const isNew = chatId === NEW_CHAT_ID;
  const { query, messages } = useChatTranscript(chatId);
  const send = useSendMessage(chatId);
  const [optimistic, setOptimistic] = useState<MessageDTO | null>(null);

  const submit = (submission: ComposerSubmit) => {
    setOptimistic(optimisticUserMessage(submission.content));
    send.mutate(submission, { onSettled: () => setOptimistic(null) });
  };

  const failure = send.isError ? sendFailureMessage(send.error) : null;
  const transcript = optimistic ? [...messages, optimistic] : messages;

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className={`${COLUMN} py-10`}>
          {query.isPending && !isNew ? (
            <FullColumnSpinner />
          ) : query.isError ? (
            <LoadFailure error={query.error} />
          ) : (
            <>
              {query.hasNextPage && (
                <button
                  type="button"
                  onClick={() => query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  className="mx-auto mb-8 block rounded-card px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:opacity-60"
                >
                  {query.isFetchingNextPage ? "Loading…" : "Load older messages"}
                </button>
              )}

              <MessageList messages={transcript} />
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-6">
        <div className={COLUMN}>
          <Composer chatId={chatId} pending={send.isPending} onSubmit={submit} />

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
