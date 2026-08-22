"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatsFilter } from "@/queries/use-chats";

const OPTIONS = [
  { value: "all", label: "All" },
  { value: "pinned", label: "Pinned" },
] as const satisfies readonly { value: ChatsFilter; label: string }[];

/**
 * The reference's `Filter by All ⌄`. The value is sent to the server, which is what makes it a filter
 * rather than a view over the page already fetched.
 *
 * `Pinned` answers correctly and answers empty: pinning needs a route this build does not have, so
 * nothing can be pinned yet. The option is real, its result is honest.
 */
export function FilterMenu({
  value,
  onChange,
}: {
  value: ChatsFilter;
  onChange: (value: ChatsFilter) => void;
}) {
  const active = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0];


  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm text-fg">
        <span className="text-fg-muted">Filter by</span>
        {active.label}
        <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onSelect={() => onChange(option.value)}>
            <Check
              className={option.value === value ? "size-3.5" : "size-3.5 opacity-0"}
              aria-hidden
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
