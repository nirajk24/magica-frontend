import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * `env` is set literally rather than read from `.env`: `lib/env.ts` validates at import time, so a
 * developer without a local `.env` would otherwise see a Zod error instead of a test result.
 *
 * The environment is jsdom for every test, including the pure ones — a single environment keeps a
 * component test from failing on a missing global depending on which file it lives in.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_vitest",
    },
  },
});
