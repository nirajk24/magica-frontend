import { vi } from "vitest";

/** The App Router surface the send mutation touches. Assert on `replace` for the `/chat/new` hop. */
export const routerMock = {
  replace: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

/**
 * The rest of the router surface, mutable so a test can put the app on a route or a query string.
 * Reset between tests alongside `routerMock`.
 */
export const locationMock = {
  pathname: "/",
  search: "",
};
