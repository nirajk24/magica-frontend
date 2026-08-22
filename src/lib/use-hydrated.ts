"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and the first render, `true` afterwards.
 *
 * Use it for anything the server cannot know — the viewer's theme, locale or clock. Rendering those
 * on the server guarantees a hydration mismatch; this reports the transition without the extra
 * render pass a mount-flag effect would cost.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
