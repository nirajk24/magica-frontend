import {
  Brain,
  ClipboardList,
  Crop,
  MessageSquare,
  Sparkles,
  Video,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Maps the registry's `display.icon` string to a glyph.
 *
 * INVARIANT: an unknown name must resolve, not throw. The backend can ship a tool with a new icon
 * before this repo knows the name, and the generic wrench is a correct answer in that case.
 */
const ICONS: Record<string, LucideIcon> = {
  image: Sparkles,
  video: Video,
  crop: Crop,
  skill: Zap,
  schema: Wrench,
  plan: ClipboardList,
  questions: MessageSquare,
  thinking: Brain,
  tool: Wrench,
};

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Wrench;
}
