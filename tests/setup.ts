import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { useUI } from "@/stores/ui";

/**
 * jsdom implements neither `matchMedia` nor `ResizeObserver`, and both are read during render —
 * `next-themes` calls `matchMedia` for the system theme, and Radix's positioning and `react-virtuoso`
 * construct a `ResizeObserver`. Without these two stubs a component test fails on the environment
 * rather than on the component.
 */
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList,
});

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

/**
 * `useRouter` throws outside a mounted App Router, so navigation is a spy the tests can assert on.
 */
vi.mock("next/navigation", async () => {
  const { routerMock } = await import("./router-mock");

  return {
    useRouter: () => routerMock,
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
});

/** Captured before any test runs, so resetting the store never needs a list of its fields. */
const initialUIState = { ...useUI.getState() };

afterEach(cleanup);
afterEach(async () => {
  const { routerMock } = await import("./router-mock");
  for (const spy of Object.values(routerMock)) spy.mockClear();

  const { useUI } = await import("@/stores/ui");
  useUI.persist.clearStorage();
  useUI.setState(initialUIState, true);
});

/**
 * Every surface in this app sits behind Clerk, so a signed-in user is the default in tests. Only
 * `useAuth` is faked: `useApi` then binds the real api-client, and a component test exercises the
 * whole chain down to MSW rather than a stubbed service.
 */
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: async () => "test-token", isLoaded: true, isSignedIn: true }),
}));
