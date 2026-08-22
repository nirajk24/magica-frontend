"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

/** Icons only, in the reference's order: system, then light, then dark. */
const OPTIONS: readonly { value: string; icon: LucideIcon; label: string }[] = [
  { value: "system", icon: Monitor, label: "System theme" },
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
];

const subscribe = () => () => {};

/**
 * The reference's theme trio: three icons in one segmented control, no text.
 *
 * The active option is painted only after hydration — `theme` is unknowable on the server, so
 * rendering it there guarantees a mismatch. `useSyncExternalStore` reports that without the extra
 * render pass a mount-flag effect would cost.
 *
 * Each control carries an `aria-label`, because an icon with no text is nameless otherwise.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div className="grid grid-cols-3 gap-1 rounded-full border border-border p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = hydrated && theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "flex h-7 items-center justify-center rounded-full transition-colors",
              active ? "bg-surface text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
