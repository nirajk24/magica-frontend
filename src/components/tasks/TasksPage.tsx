"use client";

import { CirclePlus, ListChecks, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { FilterMenu } from "@/components/tasks/FilterMenu";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { useChatList, type ChatsFilter } from "@/queries/use-chats";

const SKELETON_ROWS = 8;

/**
 * The task list at `/chat/recent`.
 *
 * Search and filter are the server's, not this page's — the brief requires search across message
 * content, which the browser cannot do over a page it has not fetched. That also means the query key
 * changes as you type, so a new search is a fresh list rather than a filtered stale one.
 */
export function TasksPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChatsFilter>("all");
  const { query, chats } = useChatList({ search, filter });

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Tasks</h1>

        <div className="flex items-center gap-2">
          <FilterMenu value={filter} onChange={setFilter} />

          <DisabledAction
            icon={ListChecks}
            label="Select tasks"
            reason="Deleting and moving tasks isn't wired into this build yet."
            className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm"
            showLabel
          />

          <Link
            href="/chat"
            className="flex h-9 items-center gap-2 rounded-full bg-fg px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            <CirclePlus className="size-4" aria-hidden />
            New task
          </Link>
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-card border border-border bg-bg-subtle px-3 py-2.5">
        <Search className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isPending ? (
          <SkeletonRows />
        ) : chats.length === 0 ? (
          <EmptyState searching={search.trim().length > 0} />
        ) : (
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 truncate text-[15px] text-fg">{chat.title}</span>
                  <RelativeDate iso={chat.updatedAt} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {query.hasNextPage && (
          <button
            type="button"
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="mt-4 w-full rounded-md py-2 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            {query.isFetchingNextPage ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Relative dates depend on the viewer's clock, so they paint after hydration (same rule as UI-12). */
function RelativeDate({ iso }: { iso: string }) {
  const hydrated = useHydrated();

  return (
    <span className="shrink-0 text-sm text-fg-subtle">
      {hydrated ? formatRelativeTime(iso) : null}
    </span>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 py-16 text-center">
      <p className="text-fg">{searching ? "No tasks match that search." : "No tasks yet"}</p>
      {!searching && (
        <p className="text-sm text-fg-muted">Start one from the composer and it will appear here.</p>
      )}
    </div>
  );
}

const SKELETON_WIDTHS = [
  "w-1/3",
  "w-1/2",
  "w-2/5",
  "w-3/5",
  "w-1/4",
  "w-5/12",
  "w-1/2",
  "w-1/3",
];

/** Eight bars with a short one in the date column, which is what the loading capture shows. */
function SkeletonRows() {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4 px-3 py-3">
          <div className={cn("h-4 animate-pulse rounded bg-surface", SKELETON_WIDTHS[index])} />
          <div className="h-3 w-20 animate-pulse rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}
