"use client";

import { Pin } from "lucide-react";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import type { ChatDTO } from "@/contracts";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/cn";
import { formatRelativeTime } from "@/lib/format";
import { useChatRowActions } from "@/components/chat/use-chat-row-actions";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * One task row: a link at rest, a checkbox target in select mode, and a right-click menu with the
 * reference's three actions — pin, rename, delete.
 *
 * Rename happens in place: the title becomes an input, `Enter` saves through `PATCH /chats/:id` and
 * `Escape` abandons it. Nothing optimistic — the row keeps its old title until the server confirms,
 * because a rename that silently failed would leave the sidebar and this list disagreeing.
 */
export function TaskRow({
  chat,
  selecting,
  selected,
  onToggleSelect,
}: {
  chat: ChatDTO;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: (chatId: string) => void;
}) {
  const { actions, renaming, saving, saveRename, cancelRename } = useChatRowActions(chat);

  if (renaming) {
    return <RenameRow chat={chat} saving={saving} onSave={saveRename} onCancel={cancelRename} />;
  }

  const row = selecting ? (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={chat.title}
      onClick={() => onToggleSelect(chat.id)}
      className={cn(rowClassName, "w-full text-left", selected && "bg-surface")}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded border text-[10px]",
          selected ? "border-accent bg-accent text-accent-fg" : "border-border-strong",
        )}
      >
        {selected && "✓"}
      </span>
      <RowBody chat={chat} />
    </button>
  ) : (
    <Link href={`/chat/${chat.id}`} className={rowClassName}>
      <RowBody chat={chat} />
    </Link>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map((action) => (
          <ContextMenuItem
            key={action.key}
            className={action.danger ? "text-danger data-[highlighted]:text-danger" : undefined}
            onSelect={action.onSelect}
          >
            <action.icon className="size-3.5" aria-hidden />
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

const rowClassName =
  "flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-surface";

function RowBody({ chat }: { chat: ChatDTO }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {chat.isFavorite && <Pin className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />}
        <span className="truncate text-[15px] text-fg">{chat.title}</span>
      </span>
      <RelativeDate iso={chat.updatedAt} />
    </>
  );
}

function RenameRow({
  chat,
  saving,
  onSave,
  onCancel,
}: {
  chat: ChatDTO;
  saving: boolean;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(chat.title);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key === "Enter" && title.trim() && !saving) {
      event.preventDefault();
      onSave(title.trim());
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-md bg-surface px-3 py-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onCancel}
        aria-label="Task name"
        className="w-full bg-transparent text-[15px] text-fg outline-none"
      />
      <span className="shrink-0 text-xs text-fg-subtle">
        {saving ? "Saving..." : "Enter to save · Esc to cancel"}
      </span>
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
