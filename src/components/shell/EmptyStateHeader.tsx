"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * The empty state's masthead: the ghost mark, a live clock, and the product's two lines of copy.
 *
 * The clock ticks and it reads the viewer's own time zone, neither of which the server can know, so
 * it paints only after hydration — rendering it during SSR guarantees a mismatch.
 */
export function EmptyStateHeader() {
  return (
    <div className="flex flex-col items-center gap-1 pb-6 text-center">
      <GhostMark />
      <LiveClock />
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Your AI worker</h1>
      <p className="text-sm text-fg-muted">Work at the speed of thought.</p>
    </div>
  );
}

function GhostMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 text-accent" role="img" aria-label="Magica">
      <path
        fill="currentColor"
        d="M16 2C9.9 2 5 6.9 5 13v14.2c0 1.3 1.5 2 2.5 1.2l2.4-2a1.6 1.6 0 0 1 2.1 0l2 1.7a1.6 1.6 0 0 0 2.1 0l2-1.7a1.6 1.6 0 0 1 2.1 0l2.3 2c1 .8 2.5.1 2.5-1.2V13C27 6.9 22.1 2 16 2Z"
      />
      <circle cx="12" cy="13" r="2.4" className="fill-bg" />
      <circle cx="20" cy="13" r="2.4" className="fill-bg" />
    </svg>
  );
}

/** `2:10 ᴾᴹ` — the meridiem is superscripted and smaller, which is what the capture shows. */
function LiveClock() {
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10_000);

    return () => clearInterval(timer);
  }, []);

  if (!hydrated) return <p className="h-4 text-xs" aria-hidden />;

  const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const [clock, meridiem] = time.split(" ");

  return (
    <p className="text-xs text-fg-muted">
      {clock}
      <sup className="ml-0.5 text-[9px]">{meridiem}</sup>
    </p>
  );
}
