"use client";

import { useEffect, useState } from "react";
import { MagicaMark } from "@/components/MagicaMark";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * The empty state's masthead: the mascot, a live clock, and the product's two lines of copy.
 *
 * The clock ticks and it reads the viewer's own time zone, neither of which the server can know, so
 * it paints only after hydration — rendering it during SSR guarantees a mismatch.
 */
export function EmptyStateHeader() {
  return (
    <div className="flex flex-col items-center pb-12 text-center">
      <MagicaMark eyes className="size-10 text-accent" />
      <div className="mt-6">
        <LiveClock />
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Your AI worker</h1>
      <p className="mt-3 text-sm text-fg-muted">Work at the speed of thought.</p>
    </div>
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
