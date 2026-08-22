import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

/**
 * `onUnhandledRequest: "error"` on purpose: a component that reaches a URL nobody mocked is a bug in
 * the component, and silently returning nothing turns it into a confusing render instead.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
