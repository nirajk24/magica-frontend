import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Renders under the providers the app supplies, with retries off — `shouldRetry` is unit-tested
 * separately, and leaving it on makes every error-path test wait for three attempts.
 */
export function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>{ui}</TooltipProvider>
      </QueryClientProvider>,
    ),
  };
}
