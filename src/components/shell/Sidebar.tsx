"use client";

import { useAuth } from "@clerk/nextjs";
import { PanelLeft, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { MagicaLogo } from "@/components/MagicaMark";
import { NAV_ITEMS } from "@/components/shell/nav";
import { SidebarFooter } from "@/components/shell/SidebarFooter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { useChatList } from "@/queries/use-chats";
import { useUI } from "@/stores/ui";

/** Enough rows to fill the visible list while the first page is in flight. */
const SKELETON_ROWS = 6;

/**
 * The sidebar, at both of its widths.
 *
 * Measured off the reference: a **240px** panel inset **8px** from the window edge, not a flush
 * column — the canvas shows through on its left and above it. Its fill is `--bg-subtle`, which in
 * light is a shade darker than the canvas and in dark is identical to it, because depth reverses
 * between the two themes.
 *
 * An anonymous visitor gets this same sidebar. Only the footer differs — see `SidebarFooter`.
 */
export function Sidebar({ onNavigate }: { onNavigate?: () => void } = {}) {
  const collapsed = useUI((state) => state.sidebarCollapsed);
  const toggleSidebar = useUI((state) => state.toggleSidebar);
  const setSearchOpen = useUI((state) => state.setSearchOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "b" || !(event.metaKey || event.ctrlKey) || event.shiftKey)
        return;

      event.preventDefault();
      toggleSidebar();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-card bg-bg-subtle transition-[width]",
        collapsed ? "w-16 items-center" : "w-[240px]",
      )}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 pt-3">
          <LogoToggle onToggle={toggleSidebar} />
          <RailButton label="Search" onClick={() => setSearchOpen(true)}>
            <Search className="size-4" aria-hidden />
          </RailButton>
        </div>
      ) : (
        <div className="flex w-full items-center justify-between px-3 py-3">
          <Link
            href="/chat"
            aria-label="Magica"
            className="flex items-center gap-1 px-1 text-[16px] font-semibold tracking-tight text-fg"
          >
            <MagicaLogo className="size-5" />
            <span className="-ml-0.5">agica</span>
          </Link>

          <div className="flex items-center gap-1">
            <RailButton label="Search" onClick={() => setSearchOpen(true)}>
              <Search className="size-4" aria-hidden />
            </RailButton>
            <Tooltip>
              <TooltipTrigger
                type="button"
                onClick={toggleSidebar}
                aria-label="Close sidebar"
                aria-expanded
                className="rounded-md p-1.5 text-fg-muted transition-colors hover:text-fg"
              >
                <PanelLeft className="size-4" aria-hidden />
              </TooltipTrigger>
              <TooltipContent>Toggle sidebar ⌘B</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      <nav
        aria-label="Main"
        className={cn("flex flex-col gap-0.5", collapsed ? "mt-2 items-center" : "w-full px-2")}
      >
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {!collapsed && <RecentTasks onNavigate={onNavigate} />}

      <div className={cn("mt-auto", collapsed ? "pb-3" : "w-full")}>
        {collapsed ? (
          <DisabledAction
            icon={Settings}
            label="Settings"
            reason="Settings aren't part of this build."
            className="rounded-md p-2"
          />
        ) : (
          <SidebarFooter />
        )}
      </div>
    </aside>
  );
}

/**
 * The rail's top slot, which is two controls in one place: the logo at rest, and the sidebar toggle
 * the moment a pointer is over it — which is how the reference fits both into a rail one icon wide.
 * The button is the toggle throughout; only the glyph swaps, so keyboard and screen-reader users
 * always have the control.
 */
function LogoToggle({ onToggle }: { onToggle: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        onClick={onToggle}
        aria-label="Expand sidebar"
        aria-expanded={false}
        className="group grid size-9 place-items-center rounded-md text-fg transition-colors hover:bg-surface"
      >
        <MagicaLogo className="size-5 group-hover:hidden" />
        <PanelLeft className="hidden size-4 text-fg-muted group-hover:block" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="right">Toggle sidebar ⌘B</TooltipContent>
    </Tooltip>
  );
}

/** A small icon button with its name in a tooltip, which is all a collapsed rail can say. */
function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        onClick={onClick}
        className="grid size-9 place-items-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg"
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavRow({
  item,
  collapsed,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;

  const content = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </>
  );

  const className = cn(
    "flex items-center rounded-md text-sm transition-colors",
    collapsed ? "size-9 justify-center" : "h-[34px] gap-2.5 px-2",
    active
      ? "bg-surface-selected text-fg"
      : "text-fg-muted hover:bg-surface-selected hover:text-fg",
  );

  /**
   * A placeholder row is not dimmed. The reference draws every nav row at full strength, and the
   * sidebar is one of the most-looked-at surfaces in the product — fading five of seven rows is a
   * visible fidelity miss. `aria-disabled` and the tooltip still say the page is not here, which is
   * where that honesty belongs (UI-7).
   */
  if (item.placeholder) {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-disabled
          aria-label={item.label}
          onClick={(event) => event.preventDefault()}
          className={cn(className, "cursor-not-allowed")}
        >
          {content}
        </TooltipTrigger>
        <TooltipContent side={collapsed ? "right" : "bottom"}>
          {item.label} isn&apos;t part of this build.
        </TooltipContent>
      </Tooltip>
    );
  }

  const link = (
    <Link href={item.href} aria-label={item.label} onClick={onNavigate} className={className}>
      {content}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * `Recent tasks`, ordered by `updatedAt` so a chat lifts to the top when it is sent to.
 *
 * The reference paints the chat before this list on a reload, so a pending list is skeleton bars
 * rather than a spinner or a blank column — the shell's height must not move when the rows land.
 */
function RecentTasks({ onNavigate }: { onNavigate?: () => void }) {
  const { isSignedIn } = useAuth();
  const pathname = usePathname();
  const { query, chats } = useChatList();

  if (!isSignedIn) return <EmptyList />;

  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <p className="px-3 pb-1 text-xs font-normal text-fg-muted">Recent tasks</p>

      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {query.isPending ? (
          <SkeletonRows />
        ) : chats.length === 0 ? (
          <EmptyList />
        ) : (
          chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/chat/${chat.id}`}
              onClick={onNavigate}
              className={cn(
                "flex h-[34px] items-center truncate rounded-md px-2 text-sm transition-colors",
                pathname === `/chat/${chat.id}`
                  ? "bg-surface-selected text-fg"
                  : "text-fg-muted hover:bg-surface-selected hover:text-fg",
              )}
            >
              {chat.title}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyList() {
  return (
    <div className="mt-4 flex flex-1 justify-center">
      <p className="text-sm text-fg-subtle">No tasks yet</p>
    </div>
  );
}

const SKELETON_WIDTHS = ["w-4/5", "w-3/5", "w-11/12", "w-2/3", "w-3/4", "w-1/2"];

function SkeletonRows() {
  return (
    <div aria-hidden className="flex flex-col gap-2 pt-1">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div
          key={index}
          className={cn("h-4 animate-pulse rounded bg-surface", SKELETON_WIDTHS[index])}
        />
      ))}
    </div>
  );
}
