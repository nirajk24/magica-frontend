import { defineConfig, devices } from "@playwright/test";

/**
 * Next loads `.env` for the app; this process does not, and the sign-in credential lives there.
 * `loadEnvFile` is Node's own, so it costs no dependency, and a missing file is not an error — the
 * public project needs nothing from it and CI may supply the values as real environment variables.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // No local .env: `pnpm e2e` still runs, and `e2e:live` reports the missing variable by name.
}

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Two projects, split by what a run costs.
 *
 * `public` drives the anonymous surface and spends nothing, so it can run on every commit. `live`
 * signs in and sends one real turn, which spends an OpenRouter request from a 50/day allowance and
 * whatever credits the turn's tools charge — so it is opt-in through `E2E_LIVE_TURN=1` and never
 * runs by accident.
 *
 * INVARIANT: `retries: 0` everywhere. A retry re-sends the turn, which buys a second request from
 * the same daily allowance to learn what the first attempt already reported.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "public",
      testMatch: /public-surface\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "auth",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "live",
      testMatch: /live-turn\.spec\.ts/,
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
    },
  ],

  /**
   * Attaches to a server that is already up rather than starting a second one — a dev server holds
   * `.next/`, and racing a build against it is how this project lost `pnpm build` for three sessions.
   */
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
