import {
  BookMarked,
  CirclePlus,
  FolderOpen,
  Library,
  MessageSquare,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rows whose page is a placeholder, so the sidebar can say so rather than lead somewhere empty. */
  placeholder?: boolean;
};

/** The reference's nav, in its order. One list, so the rail and the drawer cannot drift from it. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/chat", label: "New task", icon: CirclePlus },
  { href: "/chat/recent", label: "Tasks", icon: MessageSquare },
  { href: "/projects", label: "Projects", icon: FolderOpen, placeholder: true },
  { href: "/library", label: "Library", icon: Library, placeholder: true },
  { href: "/tools", label: "Tools", icon: Wrench, placeholder: true },
  { href: "/api-mcp", label: "API / MCP", icon: BookMarked, placeholder: true },
  { href: "/unfair-advantage", label: "Unfair Advantage", icon: Sparkles, placeholder: true },
];
