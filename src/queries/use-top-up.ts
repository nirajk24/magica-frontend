"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreditsPage } from "@/contracts";
import { ApiError } from "@/lib/api-client";
import { qk } from "@/lib/query-client";
import { useApi } from "@/lib/use-api";
import { useUI } from "@/stores/ui";

/**
 * Tops up the balance. The response carries the new balance, so the cache is written from it rather
 * than refetched — the chip and the sidebar must show the new number the moment the modal closes.
 */
export function useTopUp() {
  const api = useApi();
  const queryClient = useQueryClient();
  const pushToast = useUI((state) => state.pushToast);

  return useMutation({
    mutationFn: (amount: string) => api.topUp({ amount }),

    onSuccess: (result) => {
      queryClient.setQueryData<CreditsPage>(qk.credits(), (cached) =>
        cached ? { ...cached, balance: result.balance } : cached,
      );
      void queryClient.invalidateQueries({ queryKey: qk.credits() });
    },

    onError: (error) => {
      pushToast({
        text: error instanceof ApiError ? error.message : "That top-up didn't reach the server.",
        traceId: error instanceof ApiError ? error.traceId : null,
      });
    },
  });
}
