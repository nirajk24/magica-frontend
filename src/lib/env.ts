import { z } from "zod";

const Env = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
});

/**
 * Only `NEXT_PUBLIC_*` belongs here. Next.js inlines these at build time, so they must be
 * referenced as literal property accesses rather than looked up dynamically off process.env,
 * which is why the object is spelled out instead of passed whole.
 */
export const env = Env.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});
