"use client";

import { ArrowUp, ClipboardList, Mic, Paperclip } from "lucide-react";
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { Spinner } from "@/components/Spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { useUI } from "@/stores/ui";

const MAX_HEIGHT = 200;

/**
 * Resting height of the text area, measured from the captures. The whole box model follows from it:
 * 16px padding + this + a 4px gap + the 34px send button + 16px padding + 2px border reproduces the
 * reference's 136px in a conversation and 96px on the new-chat screen, which is the only difference
 * between the two.
 */
const RESTING_HEIGHT = { conversation: 64, "new-chat": 24 } as const;

export type ComposerVariant = keyof typeof RESTING_HEIGHT;

export type ComposerSubmit = { content: string; planMode: boolean };

/**
 * The pinned composer.
 *
 * The draft lives in the UI store keyed by chat, so switching chats or reloading does not lose typed
 * text. Plan mode is deliberately transient: it is an instruction for the next send, not a setting.
 */
export function Composer({
  chatId,
  variant = "conversation",
  placeholder = "Send a message...",
  runActive = false,
  pending = false,
  onSubmit,
}: {
  chatId: string;
  variant?: ComposerVariant;
  placeholder?: string;
  runActive?: boolean;
  pending?: boolean;
  onSubmit: (submission: ComposerSubmit) => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const draft = useUI((state) => state.drafts[chatId] ?? "");
  const setDraft = useUI((state) => state.setDraft);
  const planMode = useUI((state) => state.planModeChats.includes(chatId));
  const togglePlanMode = useUI((state) => state.togglePlanMode);

  const resting = RESTING_HEIGHT[variant];

  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, resting), MAX_HEIGHT)}px`;
  }, [draft, resting]);

  const canSend = draft.trim().length > 0 && !runActive && !pending;

  const submit = () => {
    if (!canSend) return;
    onSubmit({ content: draft.trim(), planMode });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;

    event.preventDefault();
    submit();
  };

  return (
    <div className="rounded-composer border border-border bg-surface bg-linear-to-b from-composer-from to-composer-to p-4">
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
          <DisabledAction
            icon={Paperclip}
            label="Attach a file"
            reason="Attachments aren't part of this build yet."
          />
          <PlanModeToggle enabled={planMode} onToggle={() => togglePlanMode(chatId)} />
        </div>

        <div className="flex items-center gap-3">
          <DisabledAction icon={Mic} label="Dictate" reason="Voice input isn't part of this build." />
          <SendButton canSend={canSend} pending={pending} runActive={runActive} onClick={submit} />
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

function SendButton({
  canSend,
  pending,
  runActive,
  onClick,
}: {
  canSend: boolean;
  pending: boolean;
  runActive: boolean;
  onClick: () => void;
}) {
  const label = runActive ? "A run is already in progress" : "Send message";

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        aria-disabled={!canSend}
        onClick={onClick}
        className={cn(
          "flex size-[34px] items-center justify-center rounded-full transition-colors",
          canSend ? "bg-fg text-bg" : "cursor-not-allowed bg-bg-subtle text-fg-subtle",
        )}
      >
        {pending ? (
          <Spinner className="size-4 text-current" />
        ) : (
          <ArrowUp className="size-4" aria-hidden />
        )}
      </TooltipTrigger>
      {runActive && <TooltipContent>Stopping a run lands with the next phase.</TooltipContent>}
    </Tooltip>
  );
}
