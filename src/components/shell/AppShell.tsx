"use client";

import { useAuth } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { useSelectedLayoutSegments } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { PANEL_WIDTH } from "@/components/panels/ToolDetailPanel";
import { AddCreditsModal } from "@/components/credits/AddCreditsModal";
import { SearchPalette } from "@/components/shell/SearchPalette";
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
 * is open and animates back when it closes.
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

  const chatId = segments[0] === "chat" && segments.length > 1 ? segments[1] : undefined;

  if (!isLoaded) return <FullPageSpinner />;

  return (
    <div className="flex h-dvh gap-2 p-2">
      <SearchPalette />
      <AddCreditsModal />

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
          <div className="absolute inset-y-2 left-2 flex w-2/3 max-w-[280px]">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div
        style={{ paddingRight: panelOpen ? PANEL_WIDTH : 0 }}
        className="flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out"
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
            <TopBar chatId={chatId} showFiles={chatId !== undefined} />
          </div>
        </div>

        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
