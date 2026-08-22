"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ChevronDown, FolderOpen, TriangleAlert, Zap } from "lucide-react";
import { DEFAULT_MODEL_ID } from "@/contracts";
import { DisabledAction } from "@/components/DisabledAction";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CREDIT_DIGITS, formatCredits } from "@/lib/format";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { useCredits } from "@/queries/use-credits";
import { useLlmStatus } from "@/queries/use-llm-status";

const MODEL_REASON = "Free tier. The model is chosen when a task starts and fixed for the task.";

/**
 * Hedged on purpose. The cooldown is the provider's `Retry-After` when one is sent and a 60-second
 * default otherwise, and free models usually send nothing — so a countdown would be confidently
 * wrong. "Shortly" survives being wrong in both directions.
 */
const RATE_LIMIT_REASON =
  "The free model path is rate limited right now. Try again shortly — this is shared across everyone on the free tier.";

/**
 * The bar above the content column: the chat-level model on the left, and either the account's
 * credits or the sign-in pair on the right.
 *
 * The reference puts no model control in the composer — the model belongs to the chat, and this is
 * where it is shown. An anonymous visitor sees `Sign in` / `Sign up` here instead of a balance, and
 * no folder icon, because there is nothing yet to scope files to.
 */
export function TopBar({
  chatId,
  showFiles = false,
}: {
  /** The conversation whose model the pill names, when the route is inside one. */
  chatId?: string;
  showFiles?: boolean;
}) {
  const { isSignedIn } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
      <ModelPill chatId={chatId} />

      <div className="flex items-center gap-2">
        {isSignedIn ? (
          <>
            {showFiles && (
              <DisabledAction
                icon={FolderOpen}
                label="Files in this task"
                reason="The files modal isn't part of this build yet."
                className="rounded-md p-1.5"
              />
            )}
            <CreditsChip />
          </>
        ) : (
          <>
            <SignInButton mode="modal">
              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button
                type="button"
                className="h-8 rounded-full bg-fg px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
              >
                Sign up
              </button>
            </SignUpButton>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Ids the last path segment does not describe. `openrouter/free` is the Free Models Router, which
 * picks an available free model per request — so it is a mode, not a model, and "free" would read as
 * a tier rather than a choice. The reference calls its own equivalent `Magica Auto`.
 */
const NAMED_MODELS: Record<string, string> = { "openrouter/free": "Auto" };

/** Otherwise the family name is the label: `nvidia/nemotron-3-super-120b-a12b:free` is not one. */
function modelLabel(modelId: string): string {
  return NAMED_MODELS[modelId] ?? modelId.replace(/:free$/, "").split("/").pop() ?? modelId;
}

/**
 * The chat's model, and whether the shared free-tier path is currently able to serve it.
 *
 * These are two different questions and they come from two different places. **Identity** prefers
 * `MessageDTO.aiModel` from the newest turn that recorded one — what actually answered — and falls
 * back to `ChatDTO.modelId`, what the chat is configured to use, for a conversation that has not run
 * yet. Both ride along with the chat already, so naming the model costs no extra request.
 * **Availability** is `GET /llm/status`, which is a property of the shared path and not of any turn.
 *
 * INVARIANT: never label this from `LlmStatus.limitedModel`. That field is written in one place —
 * when a rate limit is recorded — so it is null until a limit has happened and then names the model
 * that *failed*, not the one that served. It belongs only in copy about the limit.
 *
 * The reference's pill opens a picker. Ours does not: `SendMessage.modelId` is honoured when a chat
 * is created and ignored afterwards, so a picker on an existing chat would be wired to nothing.
 */
function ModelPill({ chatId }: { chatId?: string }) {
  const { chat, messages } = useChatTranscript(chatId ?? NEW_CHAT_ID);
  const { data: status } = useLlmStatus();

  const served = [...messages].reverse().find((message) => message.aiModel)?.aiModel ?? null;
  const label = modelLabel(served?.id ?? chat?.modelId ?? DEFAULT_MODEL_ID);
  const limited = Boolean(status?.rateLimitedUntil);

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-disabled
        aria-label={limited ? `${label} — rate limited` : label}
        onClick={(event) => event.preventDefault()}
        className={cn(
          "flex h-7 cursor-not-allowed items-center gap-1.5 rounded-full px-2.5 text-sm",
          limited ? "bg-amber/15 text-amber" : "bg-surface text-fg",
        )}
      >
        {limited ? (
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
        ) : (
          <span className="grid size-4 place-items-center rounded-[4px] bg-fg text-[9px] font-bold text-bg">
            M
          </span>
        )}
        <span className="max-w-[220px] truncate">{label}</span>
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{limited ? RATE_LIMIT_REASON : MODEL_REASON}</TooltipContent>
    </Tooltip>
  );
}

/** Balances render to four significant digits — `29.96M`, not `30M`. */
function CreditsChip() {
  const { data } = useCredits();

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-disabled
        aria-label="Available credits"
        onClick={(event) => event.preventDefault()}
        className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full bg-surface px-3 text-sm text-fg"
      >
        <Zap className="size-3.5 text-amber" aria-hidden />
        {data ? formatCredits(data.balance, CREDIT_DIGITS.balance) : "—"}
      </TooltipTrigger>
      <TooltipContent>The credits breakdown isn&apos;t part of this build yet.</TooltipContent>
    </Tooltip>
  );
}
