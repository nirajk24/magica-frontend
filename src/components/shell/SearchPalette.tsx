"use client";

import { MessageCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useDebounced } from "@/lib/use-debounced";
import { useChatList } from "@/queries/use-chats";
import { useUI } from "@/stores/ui";

/** Measured off the live product at a 2048px viewport, so treat it as close rather than exact. */
const PALETTE_WIDTH = 500;

/** Quiet a search box needs before it costs a request. */
const SETTLE_MS = 200;

const RESULTS_ID = "search-palette-results";
const SKELETON_ROWS = 3;

/**
 * The product's search entry point, opened from the sidebar's magnifier or with `⌘K`.
 *
 * It is mounted once, by the shell, so the shortcut works from every screen and so no row that can
 * scroll away owns the overlay.
 */
export function SearchPalette() {
  const open = useUI((state) => state.searchOpen);
  const setSearchOpen = useUI((state) => state.setSearchOpen);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;

      event.preventDefault();
      setSearchOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSearchOpen]);

  return (
    <Dialog open={open} onOpenChange={setSearchOpen}>
      <DialogContent
        title="Search"
        style={{ width: PALETTE_WIDTH }}
        overlayClassName="bg-transparent"
        className="rounded-[20px] border-border bg-panel p-0 shadow-2xl"
      >
        <PaletteBody onClose={() => setSearchOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The palette's contents, mounted only while it is open so the list is never queried in the
 * background.
 *
 * Three bands, from the capture: header and footer sit at the panel level, the result list sits in a
 * rounded **inset** block with the panel showing around it — not an edge-to-edge stripe — and the
 * focused row is raised back out of it on the panel's own colour with a soft shadow and no border.
 *
 * Search is the server's — the brief requires it to reach message content, which this side cannot
 * see. Typing costs nothing until it settles.
 */
function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [focused, setFocused] = useState(0);
  const search = useDebounced(term, SETTLE_MS);
  const { query, chats } = useChatList({ search });

  const index = Math.min(focused, Math.max(chats.length - 1, 0));

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  /**
   * Re-attached whenever the focused row changes, which is the only time the list has to move — so
   * keyboard focus stays visible without an effect that re-runs on every render.
   */
  const keepInView = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({ block: "nearest" });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocused(Math.min(index + 1, chats.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocused(Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      const chat = chats[index];
      if (chat) go(`/chat/${chat.id}`);
      return;
    }

    if (event.key.toLowerCase() === "o" && event.shiftKey && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      go("/chat");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 px-4 py-3.5">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={RESULTS_ID}
          aria-activedescendant={chats[index] ? rowId(chats[index].id) : undefined}
          aria-label="Search tasks"
          placeholder="Search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setFocused(0);
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
        />
        <kbd className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-fg-subtle">
          esc
        </kbd>
      </div>

      <div className="mx-2 max-h-[340px] min-h-[132px] overflow-y-auto rounded-xl bg-panel-inset p-1.5">
        <p className="px-2.5 py-1.5 text-xs text-fg-subtle">Tasks</p>

        {query.isPending ? (
          <SkeletonRows />
        ) : chats.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-fg-subtle">
            {search.trim().length > 0 ? "No tasks match that search." : "No tasks yet"}
          </p>
        ) : (
          <div id={RESULTS_ID} role="listbox" aria-label="Tasks">
            {chats.map((chat, position) => (
              <button
                key={chat.id}
                id={rowId(chat.id)}
                ref={position === index ? keepInView : undefined}
                type="button"
                role="option"
                aria-selected={position === index}
                onMouseMove={() => setFocused(position)}
                onClick={() => go(`/chat/${chat.id}`)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors",
                  position === index ? "bg-panel text-fg shadow-sm" : "text-fg-muted",
                )}
              >
                <MessageCircle className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                <span className="truncate">{chat.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end px-4 py-2.5">
        <button
          type="button"
          onClick={() => go("/chat")}
          className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-fg-muted transition-colors hover:text-fg"
        >
          New task
          <span className="flex gap-1 text-[11px] text-fg-muted">
            <Key>⌘</Key>
            <Key>⇧</Key>
            <Key>O</Key>
          </span>
        </button>
      </div>
    </div>
  );
}

function rowId(chatId: string): string {
  return `search-palette-${chatId}`;
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="grid size-[22px] place-items-center rounded-md border border-border bg-panel">
      {children}
    </kbd>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden className="flex flex-col gap-2 p-2">
      {Array.from({ length: SKELETON_ROWS }, (_, position) => (
        <div key={position} className="h-4 animate-pulse rounded bg-surface" />
      ))}
    </div>
  );
}
