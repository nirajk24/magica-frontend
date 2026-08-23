import { z } from "zod";

const Env = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  /** The hosted API reference. Optional: absent, the settings pane hides the link rather than
   *  offering one that 404s. */
  NEXT_PUBLIC_API_DOCS_URL: z.string().url().optional(),
});

/**
 * Only `NEXT_PUBLIC_*` belongs here. Next inlines these at build time, so each must be a literal
 * property access — passing `process.env` whole would leave them undefined.
 */
export const env = Env.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_API_DOCS_URL: process.env.NEXT_PUBLIC_API_DOCS_URL || undefined,
});
