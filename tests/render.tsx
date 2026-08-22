import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { Toaster } from "@/components/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Renders under the providers the app supplies, with retries off — `shouldRetry` is unit-tested
 * separately, and leaving it on makes every error-path test wait for three attempts.
 *
 * The toast surface is part of that tree. Mounting it here rather than per test is what stops a
 * failure path from passing against a screen the real app would have shown a message on.
 */
export function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>
          {ui}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>,
    ),
  };
}
