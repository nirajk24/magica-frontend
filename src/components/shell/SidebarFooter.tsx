"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, CreditCard, EllipsisVertical, Settings, Sparkles, UserPlus } from "lucide-react";
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
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <EllipsisVertical className="size-4 shrink-0" aria-hidden />
        {expanded ? "Less" : "More"}
      </button>

      {expanded && (
        <>
          {isSignedIn && <CreditBlock />}

          {isSignedIn && (
            <>
              <div className="flex gap-2">
                <DisabledAction
                  icon={Settings}
                  label="Settings"
                  reason="Settings aren't part of this build."
                  className="flex flex-1 items-center justify-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                  showLabel
                />
                <DisabledAction
                  icon={Sparkles}
                  label="Updates"
                  reason="Release notes aren't part of this build."
                  className="flex flex-1 items-center justify-center gap-2 rounded-card border border-border px-3 py-2 text-sm"
                  showLabel
                />
              </div>

              <InviteRow />
            </>
          )}

          <ThemeToggle />
        </>
      )}

      {isSignedIn ? (
        <div className="flex items-center px-1 pt-1">
          <UserButton showName />
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

/** Label left, arrow right — the one footer row the reference does not centre. */
function InviteRow() {
  return (
    <DisabledAction
      icon={UserPlus}
      label="Invite team members"
      reason="Teams aren't part of this build."
      className="flex w-full items-center gap-2 rounded-card border border-border px-3 py-2 text-sm [&>svg:last-child]:ml-auto"
      showLabel
      trailingIcon={ArrowRight}
    />
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

      <p className="rounded-card border border-success/50 px-3 py-1.5 text-xs text-success">
        Free tier — credits do not renew
      </p>

      <DisabledAction
        icon={CreditCard}
        label="Add Credits"
        reason="Topping up isn't wired into this build yet."
        className="flex w-full items-center justify-center gap-2 rounded-card bg-fg px-3 py-2 text-sm font-medium !text-bg"
        showLabel
      />
    </div>
  );
}
