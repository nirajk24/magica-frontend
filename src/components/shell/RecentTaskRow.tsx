"use client";

import { MoreHorizontal, Pin } from "lucide-react";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import type { ChatDTO } from "@/contracts";
import { useChatRowActions } from "@/components/chat/use-chat-row-actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/cn";

/**
 * One `Recent tasks` row: a link, and the reference's `⋯` menu on hover.
 *
 * The trigger stays mounted rather than appearing on hover so the row's width never moves, and stays
 * visible while its menu is open — otherwise moving the pointer onto the menu hides the button that
 * opened it. It is focusable, so the row is reachable without a pointer.
 *
 * The link is not the menu's trigger: nesting one inside the other makes every menu click a
 * navigation. They are siblings, and the trigger stops the click from reaching the row.
 */
export function RecentTaskRow({
  chat,
  active,
  onNavigate,
}: {
  chat: ChatDTO;
  active: boolean;
  onNavigate?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { actions, renaming, saving, saveRename, cancelRename } = useChatRowActions(chat);

  if (renaming) {
    return <RenameRow chat={chat} saving={saving} onSave={saveRename} onCancel={cancelRename} />;
  }

  return (
    <div
      className={cn(
        "group flex h-[34px] items-center gap-1 rounded-md pr-1 pl-2 transition-colors",
        active ? "bg-surface-selected text-fg" : "text-fg-muted hover:bg-surface-selected",
      )}
    >
      <Link
        href={`/chat/${chat.id}`}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm hover:text-fg"
      >
        {chat.isFavorite && <Pin className="size-3 shrink-0 text-fg-subtle" aria-hidden />}
        <span className="truncate">{chat.title}</span>
      </Link>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          aria-label={`Actions for ${chat.title}`}
          onClick={(event) => event.preventDefault()}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded text-fg-subtle outline-none transition-opacity hover:text-fg",
            "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent",
            menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>

        {/*
          Radix hands focus back to the trigger on close, and the browser paints that as a ring on a
          row the pointer has long left. Declined: every action here either moves focus itself
          (rename opens an input) or removes the row, and the trigger stays in the tab order either
          way, so nothing is stranded by leaving focus alone.
        */}
        <DropdownMenuContent align="start" onCloseAutoFocus={(event) => event.preventDefault()}>
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.key}
              className={action.danger ? "text-danger data-[highlighted]:text-danger" : undefined}
              onSelect={action.onSelect}
            >
              <action.icon className="size-3.5" aria-hidden />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
    <div className="flex h-[34px] items-center rounded-md bg-surface-selected px-2">
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onCancel}
        aria-label="Task name"
        className="w-full bg-transparent text-sm text-fg outline-none"
      />
    </div>
  );
}
