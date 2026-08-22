"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { ChevronDown, FolderOpen, Zap } from "lucide-react";
import { ALLOWED_MODELS, DEFAULT_MODEL_ID } from "@/contracts";
import { DisabledAction } from "@/components/DisabledAction";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CREDIT_DIGITS, formatCredits } from "@/lib/format";
import { useCredits } from "@/queries/use-credits";

/**
 * The bar above the content column: the chat-level model on the left, and either the account's
 * credits or the sign-in pair on the right.
 *
 * The reference puts no model control in the composer — the model belongs to the chat, and this is
 * where it is shown. An anonymous visitor sees `Sign in` / `Sign up` here instead of a balance, and
 * no folder icon, because there is nothing yet to scope files to.
 */
export function TopBar({ showFiles = false }: { showFiles?: boolean }) {
  const { isSignedIn } = useAuth();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4">
      <ModelPill />

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
 * Names the model the turn actually runs on, which the brief asks for as "OpenRouter Free status".
 *
 * The reference's pill opens a picker. Ours does not: `SendMessage.modelId` is honoured when a chat
 * is created and ignored afterwards, so a picker on an existing chat would be a control wired to
 * nothing. It states that instead.
 */
function ModelPill() {
  const label = DEFAULT_MODEL_ID.replace(/:free$/, "").split("/").pop() ?? DEFAULT_MODEL_ID;

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-disabled
        onClick={(event) => event.preventDefault()}
        className="flex h-7 cursor-not-allowed items-center gap-1.5 rounded-full bg-surface px-2.5 text-sm text-fg"
      >
        <span className="grid size-4 place-items-center rounded-[4px] bg-fg text-[9px] font-bold text-bg">
          M
        </span>
        <span className="max-w-[220px] truncate">{label}</span>
        <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden />
      </TooltipTrigger>
      <TooltipContent>
        Free tier, {ALLOWED_MODELS.length} models available. The model is fixed when a task starts.
      </TooltipContent>
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
