import { auth } from "@clerk/nextjs/server";
import type { ReactNode } from "react";

/**
 * The auth boundary for one conversation. A chat belongs to a user, so unlike `/chat` it cannot be
 * read anonymously; the check runs because the route rendered, so no path pattern can bypass it.
 *
 * `redirectToSignIn` rather than `auth.protect()`, which answers 404 for a page request and reads as
 * a broken link.
 */
export default async function ChatLayout({ children }: { children: ReactNode }) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();

  return <>{children}</>;
}
