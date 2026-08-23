"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateApiKey } from "@/contracts";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";

/** Keys the account holds, newest first. Revoked ones stay listed so an audit trail survives. */
export function useApiKeys(enabled = true) {
  const api = useApi();

  return useQuery({
    queryKey: qk.apiKeys(),
    queryFn: () => api.getApiKeys(),
    enabled,
  });
}

/**
 * Issues a key.
 *
 * INVARIANT: the plaintext is in this response and nowhere else. The caller must show it once and
 * must not write it into any cache — only the listing, which never contains it, is invalidated.
 */
export function useCreateApiKey() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (body: CreateApiKey) => api.createApiKey(body),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.apiKeys() });
    },

    onError: (error) => {
      pushToast({
        text: error instanceof ApiError ? error.message : "That key could not be created.",
        traceId: error instanceof ApiError ? error.traceId : null,
      });
    },
  });
}

export function useRevokeApiKey() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (apiKeyId: string) => api.revokeApiKey(apiKeyId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.apiKeys() });
    },

    onError: (error) => {
      pushToast({
        text: error instanceof ApiError ? error.message : "That key could not be revoked.",
        traceId: error instanceof ApiError ? error.traceId : null,
      });
    },
  });
}
