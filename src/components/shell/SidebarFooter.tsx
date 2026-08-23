"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, CreditCard, EllipsisVertical, Settings, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AccountMenu } from "@/components/shell/AccountMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DisabledAction } from "@/components/DisabledAction";
import { cn } from "@/lib/cn";
import { formatCredits, CREDIT_DIGITS } from "@/lib/format";
import { useCredits } from "@/queries/use-credits";
import { useUI } from "@/stores/ui";

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
  const router = useRouter();
  const pathname = usePathname();

  const openSettings = () => router.replace(`${pathname}?settings=api-keys`, { scroll: false });

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

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div inert={!expanded} className="flex flex-col gap-2 overflow-hidden">
          {isSignedIn && <CreditBlock />}

          {isSignedIn && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={openSettings}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-sm text-fg transition-colors hover:bg-surface"
                >
                  <Settings className="size-4" strokeWidth={2} />
                  Settings
                </button>
                <DisabledAction
                  icon={Sparkles}
                  label="Updates"
                  reason="Release notes aren't part of this build."
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-sm"
                  showLabel
                />
              </div>

              <InviteRow />
            </>
          )}

          <ThemeToggle />
        </div>
      </div>

      {isSignedIn ? (
        <AccountMenu />
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
      icon={TeamGroupIcon}
      label="Invite team members"
      reason="Teams aren't part of this build."
      className="flex w-full items-center gap-2 rounded-full border border-border bg-bg px-3 py-2 text-sm [&>svg:last-child]:ml-auto"
      showLabel
      trailingIcon={ArrowRight}
    />
  );
}

/** The reference's invite glyph: a solid three-person group, which lucide has no filled version of. */
function TeamGroupIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <circle cx="12" cy="7.4" r="2.9" />
      <circle cx="5.6" cy="8.6" r="2.2" />
      <circle cx="18.4" cy="8.6" r="2.2" />
      <path d="M12 11.6c2.98 0 5.42 2.06 5.9 4.86.08.44-.28.84-.73.84H6.83c-.45 0-.81-.4-.73-.84.48-2.8 2.92-4.86 5.9-4.86Z" />
      <path d="M5.6 12c.53 0 1.04.1 1.5.27a7.3 7.3 0 0 0-2.34 3.83H2.7c-.42 0-.75-.38-.66-.79C2.44 13.4 3.88 12 5.6 12Z" />
      <path d="M18.4 12c1.72 0 3.16 1.4 3.56 3.31.09.41-.24.79-.66.79h-2.06a7.3 7.3 0 0 0-2.34-3.83c.46-.17.97-.27 1.5-.27Z" />
    </svg>
  );
}

/** Balances render to four significant digits, which is what the reference shows beside `29.96M`. */
function AddCreditsButton() {
  const setAddCreditsOpen = useUI((state) => state.setAddCreditsOpen);

  return (
    <button
      type="button"
      onClick={() => setAddCreditsOpen(true)}
      className="flex w-full items-center justify-center gap-2 rounded-card bg-solid px-3 py-2 text-sm font-semibold text-solid-fg transition-opacity hover:opacity-90"
    >
      <CreditCard className="size-4" aria-hidden />
      Add Credits
    </button>
  );
}

function CreditBlock() {
  const { data } = useCredits();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-fg-muted">Available Credits</span>
        <span className="text-fg">
          {data ? formatCredits(data.balance, CREDIT_DIGITS.balance) : "—"}
        </span>
      </div>

      <p className="rounded-card border border-success/50 px-3 py-1.5 text-xs text-success">
        Free tier — credits do not renew
      </p>

      <AddCreditsButton />
    </div>
  );
}
