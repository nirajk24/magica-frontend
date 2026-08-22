import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * `env` is set literally rather than read from `.env`: `lib/env.ts` validates at import time, so a
 * developer without a local `.env` would otherwise see a Zod error instead of a test result.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_vitest",
    },
  },
});
