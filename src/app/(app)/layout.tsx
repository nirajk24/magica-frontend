import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

/**
 * The auth boundary for every signed-in surface. Checking here rather than in the proxy is
 * Clerk's current guidance: this runs because the route rendered, so it cannot be bypassed by
 * a path the matcher failed to anticipate.
 *
 * `redirectToSignIn` is used instead of `auth.protect()`, which answers 404 for a page request
 * and reads to the user as a broken link rather than a sign-in prompt.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  return <>{children}</>;
}
