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

/**
 * Icons are colour-coded per tool in the reference, not uniformly neutral.
 *
 * Sampled: the skill bolt is `--amber`, the schema wrench is `--info`, and the brain, sparkles and
 * clipboard are plain `--fg`. Anything unmeasured stays neutral rather than guessing a colour.
 */
const ICON_COLOURS: Record<string, string> = {
  skill: "text-amber",
  schema: "text-info",
};

export function iconColourFor(name: string): string | undefined {
  return ICON_COLOURS[name];
}
