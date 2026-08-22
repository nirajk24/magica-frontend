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
 *
 * Switching wraps `setTheme` in a **view transition** where the browser has one: every element on
 * the page changes colour in the same frame, and the transition crossfades the whole frame instead
 * of asking each element to animate its own colours — which is the only way a theme switch animates
 * without breaking every element that already declares a transition of its own. Browsers without
 * the API (and people who prefer reduced motion) get the instant switch they always had.
 */
function applyThemeSmoothly(apply: () => void) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !document.startViewTransition) {
    apply();
    return;
  }

  document.startViewTransition(apply);
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div className="grid grid-cols-3 gap-1 rounded-full bg-surface p-1">
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = hydrated && theme === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => applyThemeSmoothly(() => setTheme(value))}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "flex h-7 items-center justify-center rounded-full transition-colors",
              active ? "bg-panel text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
