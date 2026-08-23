"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateWebhookEndpoint } from "@/contracts";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";

export function useWebhookEndpoints(enabled = true) {
  const api = useApi();

  return useQuery({
    queryKey: qk.webhookEndpoints(),
    queryFn: () => api.getWebhookEndpoints(),
    enabled,
  });
}

/** The attempt log for one endpoint — the first place to look when a receiver sees nothing. */
export function useWebhookDeliveries(endpointId: string | null) {
  const api = useApi();

  return useQuery({
    queryKey: qk.webhookDeliveries(endpointId ?? ""),
    queryFn: () => api.getWebhookDeliveries(endpointId as string),
    enabled: endpointId !== null,
  });
}

/**
 * Registers a receiver.
 *
 * INVARIANT: the signing secret is in this response only, like an API key's plaintext. Show it
 * once; never cache it.
 */
export function useCreateWebhookEndpoint() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (body: CreateWebhookEndpoint) => api.createWebhookEndpoint(body),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.webhookEndpoints() });
    },

    onError: (error) => {
      pushToast({
        text: error instanceof ApiError ? error.message : "That endpoint could not be registered.",
        traceId: error instanceof ApiError ? error.traceId : null,
      });
    },
  });
}

export function useDeleteWebhookEndpoint() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (endpointId: string) => api.deleteWebhookEndpoint(endpointId),

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.webhookEndpoints() });
    },

    onError: (error) => {
      pushToast({
        text: error instanceof ApiError ? error.message : "That endpoint could not be removed.",
        traceId: error instanceof ApiError ? error.traceId : null,
      });
    },
  });
}
