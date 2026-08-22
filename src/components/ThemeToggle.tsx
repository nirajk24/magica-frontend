"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const OPTIONS = ["light", "dark", "system"] as const;

const subscribe = () => () => {};

/**
 * The active option is painted only after hydration — `theme` is unknowable on the server, so
 * rendering it there guarantees a mismatch. `useSyncExternalStore` reports that without the extra
 * render pass a mount-flag effect would cost.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <div className="inline-flex gap-1 rounded-card border border-border bg-surface p-1">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTheme(option)}
          aria-pressed={hydrated && theme === option}
          className={`rounded-card px-3 py-1 text-sm capitalize transition-colors ${
            hydrated && theme === option
              ? "bg-accent text-accent-fg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
