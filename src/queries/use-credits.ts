"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";

/**
 * The credit balance and the ledger behind it.
 *
 * Disabled while signed out: the balance is the visitor's own, and the reference shows an anonymous
 * visitor no credits chip at all. Without the guard every anonymous page load would fire a request
 * that can only 401.
 */
export function useCredits() {
  const api = useApi();
  const { isSignedIn } = useAuth();

  return useQuery({
    queryKey: qk.credits(),
    queryFn: () => api.getCredits(),
    enabled: Boolean(isSignedIn),
  });
}
