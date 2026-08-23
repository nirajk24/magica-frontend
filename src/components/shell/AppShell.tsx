"use client";

import { useAuth } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { useSelectedLayoutSegments } from "next/navigation";
import { Suspense, useState, type CSSProperties, type ReactNode } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { PANEL_WIDTH } from "@/components/panels/ToolDetailPanel";
import { AddCreditsModal } from "@/components/credits/AddCreditsModal";
import { SearchPalette } from "@/components/shell/SearchPalette";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { cn } from "@/lib/cn";
import { useUI } from "@/stores/ui";

/**
 * The frame every screen sits in: an inset sidebar beside a column holding the top bar and the page.
 *
 * The 8px gutter is measured, not decorative — the reference's sidebar is a rounded panel with the
 * canvas showing through on its left and above it, so the shell pads and the panel rounds.
 *
 * Below the mobile breakpoint the sidebar leaves the flow entirely and returns as an overlay drawer,
 * which is what the 430px capture shows: content dimmed behind, drawer over it, no layout squeeze.
 *
 * The tool detail panel is the opposite: the reference narrows the content column to make room for
 * it rather than letting it cover the transcript, so the column reserves the panel's width while it
 * is open and animates back when it closes. The reserve is a breakpoint-gated class over a CSS
 * variable rather than an inline `paddingRight`, because the panel is wider than a phone — below
 * `md` it covers the screen at `max-w-full` and reserving its width would push the transcript out
 * of the viewport entirely.
 *
 * INVARIANT: nothing renders until Clerk has resolved. `isSignedIn` is `false` while it is still
 * loading, so painting before then shows a signed-out shell — sign-in buttons, an empty task list —
 * to someone who is signed in, and then swaps it. The reference answers a reload with a bare spinner
 * for exactly this window.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const panelOpen = useUI((state) => state.openPanel !== null);
  const { isLoaded } = useAuth();

  /**
   * `/chat/recent` is the Tasks list, not a conversation — its second segment is a route name, and
   * reading it as an id asks the API for a chat called "recent" and hangs a files button off the
   * answer.
   */
  const chatId =
    segments[0] === "chat" && segments.length > 1 && segments[1] !== "recent"
      ? segments[1]
      : undefined;

  /** Screens that own their whole header: the model pill and credits belong to a conversation. */
  const bareHeader = segments[0] === "usage" || segments[1] === "recent";

  if (!isLoaded) return <FullPageSpinner />;

  return (
    <div className="flex h-dvh gap-2 p-2">
      <SearchPalette />
      <AddCreditsModal />
      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>

      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-fg/40"
          />
          {/* Sized to the sidebar it holds. A wider box leaves a transparent strip beside the panel
              that covers the backdrop, so a tap there closes nothing. */}
          <div className="absolute inset-y-2 left-2 flex w-[min(75vw,280px)]">
            <Sidebar
              onNavigate={() => setDrawerOpen(false)}
              onClose={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div
        style={{ "--panel-reserve": panelOpen ? `${PANEL_WIDTH}px` : "0px" } as CSSProperties}
        className="flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out md:pr-(--panel-reserve)"
      >
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            className={cn(
              "ml-2 rounded-md p-1.5 text-fg-muted transition-colors hover:text-fg md:hidden",
            )}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <TopBar
              chatId={chatId}
              showFiles={chatId !== undefined}
              showActions={!bareHeader}
            />
          </div>
        </div>

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
