"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { UsagePage } from "@/contracts";
import type { UsageQueryInput } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";

/**
 * Credit spend aggregated over a window, per tool and per credit source.
 *
 * Omitted bounds mean the server's current period — the server owns the cycle's clock, so the
 * client never computes "now". Signed-out visitors never fire it: the aggregation is the user's own.
 */
export function useUsage(params: UsageQueryInput = {}, { enabled = true } = {}) {
  const api = useApi();
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: qk.usage(params),
    queryFn: () => api.getUsage(params),
    enabled: Boolean(isSignedIn) && enabled,
  });
}

/**
 * The window immediately before a fetched page's own, same length, ending where it starts.
 * Derived from the response rather than computed locally so the server stays the only clock.
 */
export function previousPeriodOf(page: UsagePage | undefined): { from: string; to: string } | null {
  if (!page) return null;

  const from = new Date(page.from).getTime();
  const to = new Date(page.to).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;

  return {
    from: new Date(from - (to - from)).toISOString(),
    to: new Date(from).toISOString(),
  };
}
