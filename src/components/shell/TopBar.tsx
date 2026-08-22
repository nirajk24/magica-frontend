"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ChevronDown, FolderOpen, Rocket, TriangleAlert } from "lucide-react";
import { ALLOWED_MODELS, type ModelId } from "@/contracts";
import { MagicaLogo } from "@/components/MagicaMark";
import { DisabledAction } from "@/components/DisabledAction";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CREDIT_DIGITS, formatCredits } from "@/lib/format";
import { modelHint, modelLabel, selectedModel } from "@/lib/models";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
import { useCredits } from "@/queries/use-credits";
import { useLlmStatus } from "@/queries/use-llm-status";
import { useUI } from "@/stores/ui";

/**
 * Hedged on purpose. The cooldown is the provider's `Retry-After` when one is sent and a 60-second
 * default otherwise, and free models usually send nothing — so a countdown would be confidently
 * wrong. "Shortly" survives being wrong in both directions.
 */
const RATE_LIMIT_NOTE =
  "The free model path is rate limited right now — it is shared across everyone on the free tier. Try again shortly, or pick another model.";

/**
 * The bar above the content column: the chat's model on the left, and either the account's credits
 * or the sign-in pair on the right.
 *
 * The reference puts no model control in the composer — the model belongs to the chat, and this is
 * where it is chosen. An anonymous visitor sees `Sign in` / `Sign up` here instead of a balance, and
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
      <ModelPicker chatId={chatId ?? NEW_CHAT_ID} />

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
 * Chooses the model the next turn will ask for, and says whether the shared free-tier path can
 * currently serve one.
 *
 * These are two different questions from two different places. **Choice** is local until a send
 * carries it, then the server records it on the chat — so the trigger reads
 * `selectedModel(pending, chat.modelId)` and the menu checks that same value. **Availability** is
 * `GET /llm/status`, a property of the shared path rather than of any turn.
 *
 * INVARIANT: never label the trigger from `LlmStatus.limitedModel`. That field is written in one
 * place — when a rate limit is recorded — so it is null until a limit has happened and then names
 * the model that *failed*, not the one that will serve. It belongs only in copy about the limit,
 * which is why it appears on a menu row and never on the trigger.
 *
 * What actually answered a past turn lives in `MessageDTO.aiModel`, which under the router is a
 * resolved sub-model that was never selectable. It goes in the tooltip, not in the label.
 */
function ModelPicker({ chatId }: { chatId: string }) {
  const { chat, messages } = useChatTranscript(chatId);
  const { data: status } = useLlmStatus();
  const pending = useUI((state) => state.modelByChat[chatId]);
  const setModel = useUI((state) => state.setModel);

  const selected = selectedModel(pending, chat?.modelId);
  const served = [...messages].reverse().find((message) => message.aiModel)?.aiModel ?? null;
  const limited = Boolean(status?.rateLimitedUntil);
  const limitedModel = limited ? status?.limitedModel : null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            aria-label={limited ? `${modelLabel(selected)} — rate limited` : modelLabel(selected)}
            className={cn(
              "group flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
              limited ? "bg-amber/15 text-amber hover:bg-amber/25" : "bg-surface text-fg hover:bg-border",
            )}
          >
            {limited ? (
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <span className="grid size-5 shrink-0 place-items-center rounded-[7px] bg-fg text-bg">
                <MagicaLogo className="size-3.5" />
              </span>
            )}
            <span className="max-w-[220px] truncate">{modelLabel(selected)}</span>
            <ChevronDown
              className="size-3.5 opacity-60 transition-transform duration-150 group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {limited ? RATE_LIMIT_NOTE : servedNote(served?.id ?? null, selected)}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="start" className="min-w-[340px] rounded-2xl p-2">
        <DropdownMenuRadioGroup
          value={selected}
          onValueChange={(value) => setModel(chatId, value as ModelId)}
        >
          {ALLOWED_MODELS.map((id) => (
            <DropdownMenuRadioItem
              key={id}
              value={id}
              indicator={false}
              className="items-center gap-3 rounded-xl p-2.5 data-[state=checked]:bg-surface"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-fg text-bg">
                <MagicaLogo className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-[15px] font-medium">
                  {modelLabel(id)}
                  {id === limitedModel && (
                    <span className="rounded-full bg-amber/15 px-1.5 text-[11px] font-normal text-amber">
                      rate limited
                    </span>
                  )}
                </span>
                <span className="truncate text-sm font-normal text-fg-muted">{modelHint(id)}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * What the tooltip says when the path is healthy.
 *
 * Under `openrouter/free` the model that answered is chosen per request and is not one of the rows
 * in the menu, so naming it is the only way the screen ever admits which model did the work.
 */
function servedNote(servedId: string | null, selected: string): string {
  if (servedId === null) return "Choose the model for the next turn.";
  if (servedId === selected) return `${modelLabel(selected)} answered the last turn.`;

  return `${modelLabel(selected)} — the last turn was answered by ${modelLabel(servedId)}.`;
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
        className="flex h-9 cursor-not-allowed items-center gap-1.5 rounded-full bg-surface px-3 text-sm font-medium text-fg"
      >
        <Rocket className="size-3.5" aria-hidden />
        {data ? formatCredits(data.balance, CREDIT_DIGITS.balance) : "—"}
      </TooltipTrigger>
      <TooltipContent>The credits breakdown isn&apos;t part of this build yet.</TooltipContent>
    </Tooltip>
  );
}
