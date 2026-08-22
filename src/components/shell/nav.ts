import {
  Boxes,
  CirclePlus,
  FolderOpen,
  LibraryBig,
  MessageSquareMore,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { ApiMcpIcon } from "@/components/shell/ApiMcpIcon";
import type { ComponentType } from "react";

/** What a nav glyph must accept — lucide icons and hand-drawn ones alike. */
export type NavIcon = LucideIcon | ComponentType<{ className?: string }>;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Rows whose page is a placeholder, so the sidebar can say so rather than lead somewhere empty. */
  placeholder?: boolean;
};

/**
 * The reference's nav, in its order. One list, so the rail and the drawer cannot drift from it.
 * Each icon is matched against the lossless sidebar capture at 8x zoom — Tasks is the bubble with
 * three dots, Tools is the box cluster, and API/MCP is an open book with a gear, which lucide does
 * not ship and `ApiMcpIcon` draws.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/chat", label: "New task", icon: CirclePlus },
  { href: "/chat/recent", label: "Tasks", icon: MessageSquareMore },
  { href: "/projects", label: "Projects", icon: FolderOpen, placeholder: true },
  { href: "/library", label: "Library", icon: LibraryBig, placeholder: true },
  { href: "/tools", label: "Tools", icon: Boxes, placeholder: true },
  { href: "/api-mcp", label: "API / MCP", icon: ApiMcpIcon, placeholder: true },
  { href: "/unfair-advantage", label: "Unfair Advantage", icon: Sparkles, placeholder: true },
];
