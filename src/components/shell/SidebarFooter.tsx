"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { Ellipsis, Gift, Settings, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DisabledAction } from "@/components/DisabledAction";
import { formatCredits, CREDIT_DIGITS } from "@/lib/format";
import { useCredits } from "@/queries/use-credits";

/**
 * The sidebar's bottom block, which is where the signed-in and anonymous shells actually differ.
 *
 * Signed out the reference shows the `Magica 101` card, `Claim Offer`, the theme trio and a single
 * `Sign in` button — no balance, no account row, no team invite. Signed in those are replaced by the
 * credit block and Clerk's user button. Everything else in the sidebar is identical either way.
 */
export function SidebarFooter() {
  const { isSignedIn } = useAuth();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
      <PromoCard />

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex items-center gap-2 px-1 py-1 text-left text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <Ellipsis className="size-4" aria-hidden />
        {expanded ? "Less" : "More"}
      </button>

      {expanded && (
        <>
          {isSignedIn && <CreditBlock />}

          <DisabledAction
            icon={Gift}
            label="Claim Offer"
            reason="Offers aren't part of this build."
            className="flex w-full items-center justify-center gap-2 rounded-card bg-fg px-3 py-2 text-sm text-bg opacity-60"
            showLabel
          />

          {isSignedIn && (
            <div className="flex gap-2">
              <DisabledAction
                icon={Settings}
                label="Settings"
                reason="Settings aren't part of this build."
                className="flex flex-1 items-center justify-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                showLabel
              />
              <DisabledAction
                icon={UserPlus}
                label="Invite"
                reason="Team invites aren't part of this build."
                className="flex flex-1 items-center justify-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                showLabel
              />
            </div>
          )}

          <ThemeToggle />
        </>
      )}

      {isSignedIn ? (
        <div className="flex items-center gap-2 px-1 pt-1">
          <UserButton />
        </div>
      ) : (
        <SignInButton mode="modal">
          <button
            type="button"
            className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm text-fg transition-colors hover:bg-bg-subtle"
          >
            Sign in
          </button>
        </SignInButton>
      )}
    </div>
  );
}

/** `Magica 101` in the reference. Ours names the build rather than linking to a tour we do not have. */
function PromoCard() {
  return (
    <div className="flex items-start gap-2 rounded-card bg-surface px-3 py-2">
      <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm text-fg">Magica 101</p>
        <p className="truncate text-xs text-fg-subtle">Learn what Magica can do</p>
      </div>
    </div>
  );
}

/** Balances render to four significant digits, which is what the reference shows beside `29.96M`. */
function CreditBlock() {
  const { data } = useCredits();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 text-sm">
        <span className="text-fg-muted">Available Credits</span>
        <span className="font-mono text-fg">
          {data ? formatCredits(data.balance, CREDIT_DIGITS.balance) : "—"}
        </span>
      </div>

      <DisabledAction
        icon={Sparkles}
        label="Add Credits"
        reason="Topping up isn't wired into this build yet."
        className="flex w-full items-center justify-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
        showLabel
      />
    </div>
  );
}
