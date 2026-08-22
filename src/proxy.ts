import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Makes the Clerk session available to server components and route handlers. It deliberately
 * enforces nothing.
 *
 * Auth is checked where the protected data is read — `app/(app)/layout.tsx` here, and
 * `defineRoute` in the backend. Clerk deprecated `createRouteMatcher` for the reason that
 * matters: a path pattern can diverge from how Next.js actually routes a request, so a
 * protected resource stays reachable while the matcher looks correct.
 *
 * Named `proxy.ts` because Next 16 deprecated the `middleware` file convention.
 */
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
