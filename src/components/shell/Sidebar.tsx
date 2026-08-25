"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { BookOpen, ChevronRight, PanelLeft, Search, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MagicaLogo } from "@/components/MagicaMark";
import { NAV_ITEMS } from "@/components/shell/nav";
import { RecentTaskRow } from "@/components/shell/RecentTaskRow";
import { EXAMPLE_TITLES } from "@/examples/titles";
import { SidebarFooter } from "@/components/shell/SidebarFooter";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";
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
 *
 * INVARIANT: `onClose` means this is the mobile drawer, and a drawer is never the rail. `collapsed`
 * is persisted, so without this a sidebar collapsed on the desktop reopens as a 64px rail floating
 * inside a 280px drawer — with the difference left as a transparent strip that eats outside taps.
 * The header's toggle becomes that drawer's close button for the same reason: collapsing a panel
 * that is already an overlay does nothing a reader would recognise.
 */
export function Sidebar({
  onNavigate,
  onClose,
}: { onNavigate?: () => void; onClose?: () => void } = {}) {
  const persistedCollapse = useUI((state) => state.sidebarCollapsed);
  const toggleSidebar = useUI((state) => state.toggleSidebar);
  const setSearchOpen = useUI((state) => state.setSearchOpen);
  const collapsed = persistedCollapse && !onClose;

  const router = useRouter();
  const pathname = usePathname();
  const openSettings = () => router.replace(`${pathname}?settings=api-keys`, { scroll: false });

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
                onClick={onClose ?? toggleSidebar}
                aria-label={onClose ? "Close navigation" : "Close sidebar"}
                aria-expanded
                className="rounded-md p-1.5 text-fg-muted transition-colors hover:text-fg"
              >
                {onClose ? (
                  <X className="size-4" aria-hidden />
                ) : (
                  <PanelLeft className="size-4" aria-hidden />
                )}
              </TooltipTrigger>
              <TooltipContent>{onClose ? "Close" : "Toggle sidebar ⌘B"}</TooltipContent>
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

      {/* Outside `RecentTasks`, which returns early when signed out — taking these with it. */}
      {!collapsed && <Examples onNavigate={onNavigate} />}

      <div className={cn("mt-auto shrink-0", collapsed ? "pb-3" : "w-full")}>
        {collapsed ? (
          <RailButton label="Settings" onClick={openSettings}>
            <Settings className="size-4" aria-hidden />
          </RailButton>
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
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
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

  // A page that reads the caller's own data would only bounce to `/sign-in`, which replaces the
  // whole shell — sidebar, examples and all — for a visitor who has not decided to sign in yet.
  if (item.requiresAuth && !isSignedIn) {
    return (
      <button
        type="button"
        aria-label={item.label}
        onClick={() => openSignIn()}
        className={className}
      >
        {content}
      </button>
    );
  }

  const link = item.external ? (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      aria-label={item.label}
      onClick={onNavigate}
      className={className}
    >
      {content}
    </a>
  ) : (
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
            <RecentTaskRow
              key={chat.id}
              chat={chat}
              active={pathname === `/chat/${chat.id}`}
              onNavigate={onNavigate}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * The example conversations, kept in their own labelled section rather than mixed into Recent
 * tasks. That separation is what stops a reader wondering whose chats these are — a heading of
 * their own says it before the badge on the page does.
 *
 * Titles only. The conversations live behind the examples route so they are downloaded by someone
 * who opens one and by nobody else.
 */
function Examples({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const open = useUI((state) => state.examplesOpen);
  const toggle = useUI((state) => state.toggleExamples);

  // Until the persisted store has hydrated, `open` is the default rather than the stored choice —
  // rendering the rows before then flashes a section the reader had collapsed.
  const hydrated = useHydrated();
  const showing = hydrated && open;

  return (
    <div className="mt-4 shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={showing}
        className="flex w-full items-center gap-1 rounded-md px-3 py-1 text-xs font-normal text-fg-muted transition-colors hover:text-fg"
      >
        <ChevronRight
          className={cn("size-3 transition-transform", showing && "rotate-90")}
          aria-hidden
        />
        Examples
      </button>

      {showing && (
        <div className="px-2">
          {EXAMPLE_TITLES.map((example) => (
            <Link
              key={example.id}
              href={`/examples/${example.id}`}
              onClick={onNavigate}
              className={cn(
                "flex h-[34px] items-center gap-1.5 truncate rounded-md px-2 text-sm transition-colors",
                pathname === `/examples/${example.id}`
                  ? "bg-surface-selected text-fg"
                  : "text-fg-muted hover:bg-surface-selected hover:text-fg",
              )}
            >
              <BookOpen className="size-3 shrink-0 text-fg-subtle" aria-hidden />
              <span className="truncate">{example.title}</span>
            </Link>
          ))}
        </div>
      )}
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
