"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import type { ActiveRun, AttachmentDTO, MessageDTO } from "@/contracts";
import { PlanCard } from "@/components/blocks/PlanCard";
import { PlanProgressCard } from "@/components/blocks/PlanProgressCard";
import { Composer, type ComposerSubmit } from "@/components/chat/Composer";
import { QuestionPanel } from "@/components/questions/QuestionPanel";
import { MessageList, type TranscriptItem } from "@/components/chat/MessageList";
import { FilesModal } from "@/components/files/FilesModal";
import { ImagePreviewModal } from "@/components/files/ImagePreviewModal";
import { ToolDetailPanel } from "@/components/panels/ToolDetailPanel";
import { EmptyStateHeader } from "@/components/shell/EmptyStateHeader";
import { TemplateGallery } from "@/components/shell/TemplateGallery";
import { RadialSpinner } from "@/components/Spinner";
import { ApiError } from "@/lib/api-client";
import { useActiveRun } from "@/queries/use-active-run";
import { useStopRun } from "@/queries/use-cancel-run";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { generationDetails } from "@/lib/task-files";
import { findToolView } from "@/lib/timeline";
import { useAttachmentList } from "@/queries/use-attachments";
import { useUploadAttachments, type UploadItem } from "@/queries/use-upload-attachments";
import { parseActivePlan, parseWaitpoint } from "@/lib/waitpoints";
import { useResolveWaitpoint } from "@/queries/use-resolve-waitpoint";
import { useLlmStatus } from "@/queries/use-llm-status";
import { sendFailureMessage, useSendMessage } from "@/queries/use-send-message";
import { useUI } from "@/stores/ui";

/** The reference's composer runs slightly wider than the transcript it sits under. */
const COMPOSER_COLUMN = "mx-auto w-full max-w-[940px] px-6";

/**
 * The new-chat screen runs wider than a conversation: 900px against 880px, measured off the
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
  const activeRunQuery = useActiveRun(chatId);
  const activeRun = activeRunQuery.data ?? null;
  const { query, chat, messages } = useChatTranscript(
    chatId,
    activeRunQuery.data != null || activeRunQuery.isPending,
  );
  const live = liveRunToRender(activeRun, messages);
  const send = useSendMessage(chatId);
  const setDraft = useUI((state) => state.setDraft);
  const openPanel = useUI((state) => state.openPanel);
  const setOpenPanel = useUI((state) => state.setOpenPanel);
  const stop = useStopRun(chatId, activeRun?.runId ?? null, activeRun === null && !query.isFetching);
  const waitpoint = parseWaitpoint(activeRun?.pendingWaitpoint ?? null);
  const progressPlan = parseActivePlan(chat?.activePlan ?? null);
  const resolve = useResolveWaitpoint(chatId);
  const [dismissedWaitpointId, setDismissedWaitpointId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<{ chatId: string; message: MessageDTO } | null>(
    null,
  );
  const pending = optimistic?.chatId === chatId ? optimistic.message : null;

  const uploads = useUploadAttachments();

  const submit = (submission: ComposerSubmit) => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }

    setOptimistic({
      chatId,
      message: optimisticUserMessage(submission.content, uploads.items),
    });
    send.mutate(submission, {
      onSettled: () => setOptimistic(null),
      onSuccess: () => uploads.reset(),
    });
  };

  const failure = send.isError ? sendFailureMessage(send.error) : null;

  /**
   * A send that has been accepted but has no run to render yet. The reference shows the turn the
   * instant the message lands, so this cannot wait for dispatch — see `PendingTurn`.
   *
   * A transcript whose last row is a user message is owed a turn, so it counts too until `active-run`
   * has answered. That request mints a realtime token and is by far the slowest call on the screen,
   * while the transcript beside it returns in a fraction of the time — so without this, opening a
   * chat mid-turn shows the question with nothing under it for as long as the token takes.
   */
  const owedTurn = messages.at(-1)?.role === "user";
  const awaitingRun =
    live === null && (send.isPending || pending !== null || (activeRunQuery.isPending && owedTurn));


  const rateLimited = Boolean(useLlmStatus().data?.rateLimitedUntil);
  const panelTool = openPanel ? findToolView(messages, openPanel.invocationId) : null;
  const previewFileKey = useUI((state) => state.previewFileKey);
  const setPreviewFile = useUI((state) => state.setPreviewFile);

  /**
   * The preview row comes from the attachments route, which is also what the files modal reads — so
   * the two share one cache entry and opening a preview costs no request of its own.
   *
   * The key is an attachment id from a chip or a files row, but a generated image in the transcript
   * only knows its URL, so both resolve here. A just-sent upload the list has not paged to yet is
   * still verbatim on its own message, which is the fallback.
   */
  const { attachments: chatAttachments } = useAttachmentList({ chatId }, { enabled: !isNew });
  const previewAttachment = previewFileKey
    ? (chatAttachments.find((a) => a.id === previewFileKey || a.url === previewFileKey) ??
      messages
        .flatMap((message) => message.attachments ?? [])
        .find((a) => a.id === previewFileKey || a.url === previewFileKey) ??
      null)
    : null;
  const previewGeneration = generationDetails(messages, previewAttachment?.url ?? null);

  const planPending = waitpoint?.kind === "plan_approval";

  /**
   * The approval card is the last thing in the transcript, not a docked panel: it belongs to the turn
   * that produced it, so it scrolls away with the conversation rather than covering it.
   */
  const planCard =
    waitpoint?.kind === "plan_approval" ? (
      <PlanCard
        plan={waitpoint.plan}
        resolving={resolve.isPending}
        onApprove={(executionMode) =>
          resolve.mutate({
            waitpointId: waitpoint.id,
            body: { kind: "plan_approval", approved: true, executionMode },
          })
        }
        onRequestChanges={(feedback) =>
          resolve.mutate({
            waitpointId: waitpoint.id,
            body: { kind: "plan_approval", approved: false, feedback },
          })
        }
      />
    ) : null;

  const items = useMemo<TranscriptItem[]>(() => {
    const rows: TranscriptItem[] = [...messages, ...(pending ? [pending] : [])].map((message) => ({
      kind: "message",
      message,
    }));

    if (live) rows.push({ kind: "live", chatId, run: live });
    else if (awaitingRun) rows.push({ kind: "pending" });

    if (planPending) rows.push({ kind: "plan" });

    return rows;
  }, [messages, pending, live, chatId, awaitingRun, planPending]);

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
              chatId={chatId}
              planCard={planCard}
              runActive={activeRun !== null}
              onStartReached={() => {
                if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
              }}
            />
          )}
        </div>
      )}

      <div className={showEmptyState ? "min-h-0 flex-1 overflow-y-auto pt-28 pb-10" : "shrink-0 pb-6"}>
        <div className={showEmptyState ? EMPTY_STATE_COLUMN : COMPOSER_COLUMN}>
          {showEmptyState && <EmptyStateHeader />}

          {progressPlan && (
            <div className="mb-3">
              <PlanProgressCard plan={progressPlan} />
            </div>
          )}

          {waitpoint?.kind === "questions" && dismissedWaitpointId !== waitpoint.id ? (
            <QuestionPanel
              payload={waitpoint.questions}
              resolving={resolve.isPending}
              onResolve={(resolution) =>
                resolve.mutate({ waitpointId: waitpoint.id, body: resolution })
              }
              onDismiss={() => setDismissedWaitpointId(waitpoint.id)}
            />
          ) : (
            <>
              {waitpoint?.kind === "questions" && (
                <button
                  type="button"
                  onClick={() => setDismissedWaitpointId(null)}
                  className="mb-2 flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
                >
                  The agent is waiting on your answers — resume answering
                </button>
              )}
              <Composer
                chatId={chatId}
                runActive={activeRun !== null}
                stopping={stop.stopping}
                placeholder={isNew ? "Assign a task or ask anything..." : "Send a message..."}
                pending={send.isPending}
                uploads={uploads}
                onSubmit={submit}
                onStop={stop.stop}
              />
            </>
          )}

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
      {!isNew && <FilesModal chatId={chatId} />}
      {previewAttachment && (
        <ImagePreviewModal
          attachment={previewAttachment}
          prompt={previewGeneration?.prompt ?? null}
          model={previewGeneration?.model ?? null}
          onClose={() => setPreviewFile(null)}
        />
      )}
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
 * The uploads the optimistic bubble should render, in chip order.
 *
 * Only ready items appear: an upload still in flight has no attachment id, so it was not part of the
 * submission either. The id is the server's own, which is what lets a click on this bubble open the
 * preview once the attachment list has caught up.
 */
function optimisticAttachments(items: readonly UploadItem[]): AttachmentDTO[] {
  return items
    .filter((item) => item.status === "ready" && item.attachmentId !== null)
    .map((item) => ({
      id: item.attachmentId as string,
      type: mediaTypeOf(item.contentType),
      source: "uploaded",
      // The local object URL, so the thumbnail is on screen without waiting for a round trip.
      url: item.previewUrl,
      name: item.name,
      contentType: item.contentType,
      size: item.size,
      status: "ready",
      metadata: null,
      expiresAt: null,
      createdAt: new Date().toISOString(),
    }));
}

/** Non-media files never reach a ready upload, so the fallback is unreachable rather than a guess. */
function mediaTypeOf(contentType: string): AttachmentDTO["type"] {
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";

  return "image";
}

/**
 * The bubble shown between pressing Enter and the server confirming.
 *
 * It is deliberately not a `MessageDTO` from the cache — see `useSendMessage`. The id is a local
 * marker and never reaches the server. It is held against the chat it was typed into, because
 * `/chat` sends and then replaces the route: React may keep this component, and an unkeyed bubble
 * would sit beside the real message for a render.
 *
 * INVARIANT: it carries the attachments too. The reference shows text and image together the instant
 * Enter is pressed, and a bubble built without them reads as the image having been dropped.
 */
function optimisticUserMessage(content: string, uploads: readonly UploadItem[]): MessageDTO {
  const attachments = optimisticAttachments(uploads);

  return {
    id: "optimistic-user-message",
    role: "user",
    status: "success",
    content,
    contentBlocks: null,
    attachments: attachments.length > 0 ? attachments : null,
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
