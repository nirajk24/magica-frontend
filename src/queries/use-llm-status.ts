"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";

const POLL_MS = 30_000;

/**
 * Whether the shared free-tier model path is currently refusing work.
 *
 * `rateLimitedUntil` is null once the cooldown has elapsed, so the server owns the clock comparison
 * and this never has to do date maths. It is polled rather than read once, because the limit both
 * arrives and clears without anything on this screen causing it.
 *
 * INVARIANT: this answers *availability*, not identity. `limitedModel` names the model that hit the
 * limit, so it belongs only in copy about the limit itself — never as the pill's label.
 */
export function useLlmStatus() {
  const api = useApi();

  return useQuery({
    queryKey: qk.llmStatus(),
    queryFn: () => api.getLlmStatus(),
    refetchInterval: POLL_MS,
    staleTime: POLL_MS,
  });
}
