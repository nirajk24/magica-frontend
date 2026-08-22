import { vi } from "vitest";

/**
 * Auth state for a test, and the spies the sign-in gate is asserted through.
 *
 * Mutable so a test can sign the visitor out without re-mocking the module: `/chat` is reachable
 * anonymously, so both states are real paths through the screen.
 */
const TEST_USER = {
  fullName: "Niraj Kumar",
  imageUrl: "https://img.clerk.test/avatar.png",
  primaryEmailAddress: { emailAddress: "niraj@example.com" },
};

export const clerkMock = {
  isSignedIn: true,
  /** `false` reproduces the window before Clerk has resolved, where the shell must not paint. */
  isLoaded: true,
  user: TEST_USER as typeof TEST_USER | null,
  getToken: vi.fn(async () => "test-token"),
  openSignIn: vi.fn(),
  openUserProfile: vi.fn(),
  signOut: vi.fn(async () => {}),
};

export function resetClerkMock() {
  clerkMock.isSignedIn = true;
  clerkMock.isLoaded = true;
  clerkMock.user = TEST_USER;
  clerkMock.getToken.mockClear();
  clerkMock.openSignIn.mockClear();
  clerkMock.openUserProfile.mockClear();
  clerkMock.signOut.mockClear();
}
