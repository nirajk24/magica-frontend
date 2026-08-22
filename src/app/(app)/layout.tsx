import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

/**
 * The auth boundary for every signed-in surface. It runs because the route rendered, so no path
 * pattern can bypass it.
 *
 * Uses `redirectToSignIn` rather than `auth.protect()`, which answers 404 for a page request and
 * reads as a broken link.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  return <>{children}</>;
}
