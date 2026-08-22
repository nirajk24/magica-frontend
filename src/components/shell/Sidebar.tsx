"use client";

import { useAuth } from "@clerk/nextjs";
import { PanelLeft, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "flex shrink-0 flex-col overflow-hidden rounded-card bg-bg-subtle transition-[width]",
        collapsed ? "w-[52px]" : "w-[240px]",
      )}
    >
      <div className="flex items-center justify-between px-3 py-3">
        {!collapsed && (
          <Link href="/chat" className="px-1 text-[15px] font-semibold tracking-tight text-fg">
            Magica
          </Link>
        )}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <DisabledIcon
              icon={Search}
              label="Search tasks"
              reason="Search lives on the Tasks page in this build."
            />
          )}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="rounded-md p-1 text-fg-subtle transition-colors hover:text-fg"
          >
            <PanelLeft className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.href} item={item} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      {!collapsed && <RecentTasks onNavigate={onNavigate} />}

      <div className="mt-auto">{!collapsed && <SidebarFooter />}</div>
    </aside>
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
    "flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
    active ? "bg-surface text-fg" : "text-fg-muted hover:bg-surface hover:text-fg",
    collapsed && "justify-center",
  );

  if (item.placeholder) {
    return (
      <Tooltip>
        <TooltipTrigger
          type="button"
          aria-disabled
          aria-label={item.label}
          onClick={(event) => event.preventDefault()}
          className={cn(className, "cursor-not-allowed opacity-60")}
        >
          {content}
        </TooltipTrigger>
        <TooltipContent>{item.label} isn&apos;t part of this build.</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={item.href} aria-label={item.label} onClick={onNavigate} className={className}>
      {content}
    </Link>
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
      <p className="px-3 pb-1 text-xs text-fg-subtle">Recent tasks</p>

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
                "block truncate rounded-md px-2 py-1.5 text-sm transition-colors",
                pathname === `/chat/${chat.id}`
                  ? "bg-surface text-fg"
                  : "text-fg-muted hover:bg-surface hover:text-fg",
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

function DisabledIcon({
  icon: Icon,
  label,
  reason,
}: {
  icon: typeof Search;
  label: string;
  reason: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-disabled
        aria-label={label}
        onClick={(event) => event.preventDefault()}
        className="cursor-not-allowed rounded-md p-1 text-fg-subtle/60"
      >
        <Icon className="size-4" aria-hidden />
      </TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}
