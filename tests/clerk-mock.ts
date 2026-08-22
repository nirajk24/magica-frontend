import { vi } from "vitest";

/**
 * Auth state for a test, and the spies the sign-in gate is asserted through.
 *
 * Mutable so a test can sign the visitor out without re-mocking the module: `/chat` is reachable
 * anonymously, so both states are real paths through the screen.
 */
export const clerkMock = {
  isSignedIn: true,
  getToken: vi.fn(async () => "test-token"),
  openSignIn: vi.fn(),
};

export function resetClerkMock() {
  clerkMock.isSignedIn = true;
  clerkMock.getToken.mockClear();
  clerkMock.openSignIn.mockClear();
}
