"use client";

import { Loader2 } from "lucide-react";
import type { RunConnection } from "@/components/chat/LiveRun";

const COPY: Record<Exclude<RunConnection, "live">, string> = {
  reconnecting: "Reconnecting…",
  polling: "Live updates unavailable — refreshing from the server",
};

/**
 * Says out loud what the run's transport is doing, so a stream that has degraded reads as degraded
 * rather than as a turn that stopped moving.
 *
 * It renders nothing while the connection is healthy, and it reports the state `LiveRun` already
 * tracks — the bounded retries and the REST fallback are its behaviour, not this component's.
 */
export function ConnectionPill({ connection }: { connection: RunConnection }) {
  if (connection === "live") return null;

  return (
    <p
      role="status"
      className="mb-2 flex w-fit items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-fg-muted"
    >
      <Loader2 className="size-3 animate-spin" aria-hidden />
      {COPY[connection]}
    </p>
  );
}
