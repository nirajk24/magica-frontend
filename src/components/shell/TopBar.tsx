"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ChevronDown, FolderOpen, TriangleAlert } from "lucide-react";
import { ALLOWED_MODELS, type ModelId } from "@/contracts";
import { MagicaLogo } from "@/components/MagicaMark";
import { CreditsPopover } from "@/components/credits/CreditsPopover";
import { cn } from "@/lib/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { modelHint, modelLabel, ROUTER_MODEL_ID, selectedModel } from "@/lib/models";
import { NEW_CHAT_ID, useChatTranscript } from "@/queries/use-chat";
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
 * The router heads the menu under its own heading, because choosing it is choosing a behaviour
 * rather than a model. Partitioned by id, not by position: `ALLOWED_MODELS` is generated from the
 * backend contract, so its ordering is not this screen's to depend on.
 */
const ROUTER_MODEL = ALLOWED_MODELS.find((id) => id === ROUTER_MODEL_ID);
const PINNED_MODELS = ALLOWED_MODELS.filter((id) => id !== ROUTER_MODEL_ID);

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
  showActions = true,
}: {
  /** The conversation whose model the pill names, when the route is inside one. */
  chatId?: string;
  showFiles?: boolean;
  /** The usage page shows a bare top bar — no model pill, no credits chip — like the reference. */
  showActions?: boolean;
}) {
  const { isSignedIn } = useAuth();
  const setFilesOpen = useUI((state) => state.setFilesOpen);

  if (!showActions) return <header className="h-14 shrink-0" />;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
      <ModelPicker chatId={chatId ?? NEW_CHAT_ID} />

      <div className="flex items-center gap-2">
        {isSignedIn ? (
          <>
            {showFiles && (
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label="Files in this task"
                  onClick={() => setFilesOpen(true)}
                  className="grid size-9 place-items-center rounded-full border border-border text-fg-muted transition-colors hover:bg-surface hover:text-fg"
                >
                  <FolderOpen className="size-4" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Files in this task</TooltipContent>
              </Tooltip>
            )}
            <CreditsPopover />
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
                className="h-8 rounded-full bg-fg px-4 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
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
              "group flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-colors",
              limited
                ? "bg-amber/15 text-amber hover:bg-amber/25"
                : "border border-border text-fg hover:bg-surface",
            )}
          >
            {limited ? (
              <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <span className="grid size-4 shrink-0 place-items-center rounded-[5px] bg-fg text-bg">
                <MagicaLogo className="size-2.5" />
              </span>
            )}
            <span className="max-w-[220px] truncate">{modelLabel(selected)}</span>
            <ChevronDown
              className="size-3 opacity-60 transition-transform duration-150 group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {limited ? RATE_LIMIT_NOTE : servedNote(served?.id ?? null, selected)}
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="start" className="min-w-[288px] rounded-xl p-1.5">
        <DropdownMenuRadioGroup
          value={selected}
          onValueChange={(value) => setModel(chatId, value as ModelId)}
        >
          {ROUTER_MODEL && <ModelRow id={ROUTER_MODEL} limitedModel={limitedModel} />}

          {PINNED_MODELS.length > 0 && <DropdownMenuLabel>OpenRouter models</DropdownMenuLabel>}
          {PINNED_MODELS.map((id) => (
            <ModelRow key={id} id={id} limitedModel={limitedModel} />
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One selectable row: the mark, the model's name, and the single line under it. */
function ModelRow({ id, limitedModel }: { id: ModelId; limitedModel?: string | null }) {
  return (
    <DropdownMenuRadioItem
      value={id}
      indicator={false}
      className="items-center gap-2.5 rounded-lg p-2 data-[state=checked]:bg-surface"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-fg text-bg">
        <MagicaLogo className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
          {modelLabel(id)}
          {id === limitedModel && (
            <span className="rounded-full bg-amber/15 px-1.5 text-[10px] font-normal text-amber">
              rate limited
            </span>
          )}
        </span>
        <span className="truncate text-[11px] font-normal text-fg-muted">{modelHint(id)}</span>
      </span>
    </DropdownMenuRadioItem>
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
