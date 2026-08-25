"use client";

import { Pin, PinOff, Pencil, Trash2, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ChatDTO } from "@/contracts";
import { useDeleteChats, useUpdateChat } from "@/queries/use-chat-mutations";

export type ChatRowAction = {
  key: "pin" | "rename" | "delete";
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  onSelect: () => void;
};

/**
 * The reference's row actions, for every surface that lists chats.
 *
 * The sidebar and the Tasks page draw different menu primitives — a `⋯` dropdown against a
 * right-click context menu — so what is shared is the behaviour and the labels, not the markup. One
 * source means the two cannot drift into pinning through different fields or disagreeing on whether
 * a pinned row says "Pin" or "Unpin".
 *
 * Rename is state rather than a mutation: it turns the row into an input, and the caller decides
 * what that looks like. Nothing here is optimistic — a row keeps its old title until the server
 * confirms, because a rename that silently failed would leave two lists disagreeing.
 */
export function useChatRowActions(chat: ChatDTO) {
  const [renaming, setRenaming] = useState(false);
  const update = useUpdateChat();
  const remove = useDeleteChats();

  const actions: ChatRowAction[] = [
    {
      key: "pin",
      label: chat.isFavorite ? "Unpin" : "Pin to top",
      icon: chat.isFavorite ? PinOff : Pin,
      onSelect: () => update.mutate({ chatId: chat.id, body: { isFavorite: !chat.isFavorite } }),
    },
    {
      key: "rename",
      label: "Rename",
      icon: Pencil,
      onSelect: () => setRenaming(true),
    },
    {
      key: "delete",
      label: "Delete",
      icon: Trash2,
      danger: true,
      onSelect: () => remove.mutate([chat.id]),
    },
  ];

  return {
    actions,
    renaming,
    saving: update.isPending,
    cancelRename: () => setRenaming(false),
    saveRename: (title: string) =>
      update.mutate({ chatId: chat.id, body: { title } }, { onSuccess: () => setRenaming(false) }),
  };
}
