import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Exposes the Clerk session to server components and route handlers, and enforces nothing.
 *
 * Auth is checked where the data is read — `app/(app)/layout.tsx` here. Path-matching here
 * instead would leave a resource reachable whenever the pattern and Next's routing disagree.
 */
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
