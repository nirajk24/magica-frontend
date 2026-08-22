"use client";

import { X } from "lucide-react";
import { useUI } from "@/stores/ui";

/**
 * Where an action that failed away from its own control reports itself — stopping a run, retrying a
 * turn. A send failure stays inline beside the composer, because that is where its restored draft is.
 *
 * Nothing here dismisses itself on a timer. Each toast carries the backend's `traceId`, and a
 * message that disappears before it is read cannot be quoted in a bug report.
 */
export function Toaster() {
  const toasts = useUI((state) => state.toasts);
  const dismissToast = useUI((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex w-full max-w-[420px] items-start gap-3 rounded-card border border-danger/40 bg-surface px-3 py-2.5 shadow-lg"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-5 text-fg">{toast.text}</p>
            {toast.traceId && (
              <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{toast.traceId}</p>
            )}
          </div>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-fg-subtle transition-colors hover:text-fg"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
