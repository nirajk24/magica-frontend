"use client";

import { ArrowUp, ClipboardList, Mic, Plug } from "lucide-react";
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { Spinner } from "@/components/Spinner";
import { AttachButton, UploadChips } from "@/components/chat/ComposerAttachments";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { useUploadAttachments, type UploadAttachments } from "@/queries/use-upload-attachments";
import { useUI } from "@/stores/ui";

const MAX_HEIGHT = 200;

/**
 * Resting height of the text area, measured from the captures. The whole box model follows from it:
 * 16px padding + this + a 4px gap + the 34px send button + 16px padding + 2px border reproduces the
 * reference's ~132px box.
 *
 * The new-chat screen and a conversation use the **same** height. Four readings put the two within
 * ten pixels of each other and the sign of the gap flips between capture pairs, so it is measurement
 * noise rather than a second box model.
 */
const RESTING_HEIGHT = 64;

export type ComposerSubmit = { content: string; planMode: boolean; attachmentIds: string[] };

/**
 * The pinned composer.
 *
 * The draft lives in the UI store keyed by chat, so switching chats or reloading does not lose typed
 * text. Plan mode is deliberately transient: it is an instruction for the next send, not a setting.
 */
export function Composer({
  chatId,
  placeholder = "Send a message...",
  runActive = false,
  stopping = false,
  pending = false,
  uploads: sharedUploads,
  onSubmit,
  onStop,
}: {
  chatId: string;
  placeholder?: string;
  runActive?: boolean;
  /** Held from the Stop click until the cancelled turn is on screen, so the control cannot flicker. */
  stopping?: boolean;
  pending?: boolean;
  /** Passed in by the screen that owns the send, so a successful send can clear the chips. */
  uploads?: UploadAttachments;
  onSubmit: (submission: ComposerSubmit) => void;
  onStop?: () => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const draft = useUI((state) => state.drafts[chatId] ?? "");
  const setDraft = useUI((state) => state.setDraft);
  const planMode = useUI((state) => state.planModeChats.includes(chatId));
  const togglePlanMode = useUI((state) => state.togglePlanMode);
  const ownUploads = useUploadAttachments();
  const uploads = sharedUploads ?? ownUploads;

  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, RESTING_HEIGHT), MAX_HEIGHT)}px`;
  }, [draft]);

  const attachmentsBlocking = !uploads.settled || uploads.items.some((i) => i.status === "failed");
  const canSend = draft.trim().length > 0 && !runActive && !pending && !attachmentsBlocking;

  const submit = () => {
    if (!canSend) return;
    onSubmit({ content: draft.trim(), planMode, attachmentIds: uploads.readyIds });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  };

  return (
    <div className="rounded-composer border border-border bg-surface bg-linear-to-b from-composer-from to-composer-to p-4 transition-colors focus-within:border-border-strong">
      <UploadChips uploads={uploads} hidden={pending} />
      <textarea
        ref={textarea}
        rows={1}
        value={draft}
        onChange={(event) => setDraft(chatId, event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label="Message"
        className="block max-h-[200px] w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-6 text-fg outline-none placeholder:text-fg-subtle"
      />

      <div className="mt-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AttachButton uploads={uploads} disabled={runActive} />
          <DisabledAction
            icon={Plug}
            label="Connect apps"
            reason="Integrations aren't part of this build."
          />
          <PlanModeToggle enabled={planMode} onToggle={() => togglePlanMode(chatId)} />
        </div>

        <div className="flex items-center gap-3">
          <DisabledAction icon={Mic} label="Dictate" reason="Voice input isn't part of this build." />
          {runActive || stopping ? (
            <StopButton stopping={stopping} onClick={onStop} />
          ) : (
            <SendButton canSend={canSend} pending={pending} onClick={submit} />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Plan mode has no counterpart in the reference — plans there are agent-initiated. It is required by
 * the brief, so it takes the slot the reference gives an integrations control we do not implement.
 */
function PlanModeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-pressed={enabled}
        aria-label="Plan mode"
        onClick={onToggle}
        className={cn(
          "rounded-md p-0.5 transition-colors",
          enabled ? "bg-accent text-accent-fg" : "text-fg-subtle hover:text-fg",
        )}
      >
        <ClipboardList className="size-4" aria-hidden />
      </TooltipTrigger>
      <TooltipContent>
        {enabled ? "Plan mode on — the agent proposes a plan first" : "Plan first, then execute"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * At rest there is no disc at all — the capture shows a bare muted arrow until there is something to
 * send, and the filled circle appears with the first character. The 34px hit target stays either
 * way; only the fill comes and goes.
 */
function SendButton({
  canSend,
  pending,
  onClick,
}: {
  canSend: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Send message"
      aria-disabled={!canSend}
      onClick={onClick}
      className={cn(
        "flex size-[34px] items-center justify-center rounded-full transition-colors",
        canSend ? "bg-fg text-bg" : "cursor-not-allowed text-fg-subtle",
      )}
    >
      {pending ? (
        <Spinner className="size-4 text-current" />
      ) : (
        <ArrowUp className="size-4" aria-hidden />
      )}
    </button>
  );
}

/**
 * The send arrow's replacement while a run is in flight: the same 34px disc in a red tint, holding a
 * 14px square. Both sizes and both colours are measured off the reference, and the square's fill is
 * the same `--danger` the failed tool card uses.
 *
 * It stays on screen through `stopping`, after the cancel has been accepted but before the cancelled
 * turn has been read back, so the control never flips to a send arrow and back.
 */
function StopButton({ stopping, onClick }: { stopping: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={stopping ? "Stopping" : "Stop run"}
      aria-disabled={stopping}
      aria-busy={stopping}
      onClick={() => {
        if (!stopping) onClick?.();
      }}
      className={cn(
        "flex size-[34px] items-center justify-center rounded-full bg-danger-surface transition-opacity",
        stopping && "cursor-not-allowed opacity-60",
      )}
    >
      <span className="size-[14px] rounded-[3px] bg-danger" aria-hidden />
    </button>
  );
}
