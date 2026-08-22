"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

/**
 * The account row and the menu it opens: avatar left, name right, opening upward to
 * name · email · `Manage account` · `Sign out`.
 *
 * This lays itself out rather than styling Clerk's `<UserButton/>`. That component renders
 * `[name][avatar]` with no width of its own, so its identifier overflows a 240px sidebar — and an
 * account whose name is an email, which a development instance always has, overflows badly. Two
 * passes at overriding its internals did not hold.
 *
 * **Account management is still Clerk's.** `openUserProfile` opens Clerk's real Profile/Security
 * modal and `signOut` is Clerk's; only the two-item menu in front of them is ours, and that is the
 * part the reference shows exactly. See UI-6.
 */
export function AccountMenu() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  if (!user) return null;

  const name = user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Account";
  const email = user.primaryEmailAddress?.emailAddress ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account"
        className="flex w-full min-w-0 items-center gap-2 rounded-card border border-border px-2 py-1.5 text-left transition-colors hover:bg-surface"
      >
        <Avatar url={user.imageUrl} name={name} />
        <span className="min-w-0 flex-1 truncate text-right text-sm text-fg">{name}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="top" className="w-[232px]">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar url={user.imageUrl} name={name} />
          <div className="min-w-0">
            <p className="truncate text-sm text-fg">{name}</p>
            {email && <p className="truncate text-xs text-fg-subtle">{email}</p>}
          </div>
        </div>

        <div className="my-1 h-px bg-border" />

        <DropdownMenuItem onSelect={() => openUserProfile()}>
          <Settings className="size-4 shrink-0" aria-hidden />
          Manage account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut className="size-4 shrink-0" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Falls back to an initial, because a Clerk account need not have an image. */
function Avatar({ url, name, className }: { url?: string; name: string; className?: string }) {
  const classes = cn("size-6 shrink-0 rounded-full object-cover", className);

  if (url) return <img src={url} alt="" className={classes} />;

  return (
    <span className={cn(classes, "grid place-items-center bg-accent text-[11px] text-accent-fg")}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
