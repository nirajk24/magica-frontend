"use client";

import { CirclePlus, FolderInput, ListChecks, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DisabledAction } from "@/components/DisabledAction";
import { Spinner } from "@/components/Spinner";
import { FilterMenu } from "@/components/tasks/FilterMenu";
import { TaskRow } from "@/components/tasks/TaskRow";
import { cn } from "@/lib/cn";
import { useChatList, type ChatsFilter } from "@/queries/use-chats";
import { useDeleteChats } from "@/queries/use-chat-mutations";

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
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const { query, chats } = useChatList({ search, filter });
  const remove = useDeleteChats();

  const toggleSelect = (chatId: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });

  const exitSelectMode = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    remove.mutate([...selected], { onSuccess: exitSelectMode });
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 px-8 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Tasks</h1>

        <div className="flex items-center gap-2">
          <FilterMenu value={filter} onChange={setFilter} />

          <button
            type="button"
            onClick={() => (selecting ? exitSelectMode() : setSelecting(true))}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-panel px-4 text-sm text-fg transition-colors hover:bg-surface"
          >
            {!selecting && <ListChecks className="size-4" aria-hidden />}
            {selecting ? "Done" : "Select tasks"}
          </button>

          <Link
            href="/chat"
            className="flex h-10 items-center gap-2 rounded-full bg-fg px-4 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            <CirclePlus className="size-4" aria-hidden />
            New task
          </Link>
        </div>
      </div>

      <label className="flex h-11 items-center gap-2.5 rounded-2xl border border-border-strong/60 bg-bg px-3.5">
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

      {selecting && (
        <div className="flex items-center justify-between gap-4 px-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={selected.size > 0 && selected.size === chats.length}
            aria-label="Select all"
            onClick={() =>
              setSelected(
                selected.size === chats.length ? new Set() : new Set(chats.map((chat) => chat.id)),
              )
            }
            className="flex items-center gap-4 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-4 place-items-center rounded border text-[10px]",
                selected.size > 0 && selected.size === chats.length
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border-strong",
              )}
            >
              {selected.size > 0 && selected.size === chats.length && "✓"}
            </span>
            {selected.size} Selected
          </button>

          <div className="flex items-center gap-1 text-fg-muted">
            <DisabledAction
              icon={FolderInput}
              label="Add to project"
              reason="Projects aren't part of this build."
              className="rounded-md p-2"
            />
            <button
              type="button"
              aria-label="Delete selected tasks"
              disabled={selected.size === 0 || remove.isPending}
              onClick={deleteSelected}
              className="rounded-md p-2 transition-colors hover:text-danger disabled:opacity-50"
            >
              {remove.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
            </button>
            <button
              type="button"
              aria-label="Exit select mode"
              onClick={exitSelectMode}
              className="rounded-md p-2 transition-colors hover:text-fg"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isPending ? (
          <SkeletonRows />
        ) : chats.length === 0 ? (
          <EmptyState searching={search.trim().length > 0} />
        ) : (
          <ul>
            {chats.map((chat) => (
              <li key={chat.id}>
                <TaskRow
                  chat={chat}
                  selecting={selecting}
                  selected={selected.has(chat.id)}
                  onToggleSelect={toggleSelect}
                />
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
