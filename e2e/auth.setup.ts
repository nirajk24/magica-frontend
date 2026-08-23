import { expect, test as setup } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const STATE_PATH = "e2e/.auth/user.json";

/**
 * Signs in once and saves the browser session, so the specs that need an account do not each pay a
 * sign-in — and so a credential appears in exactly one place.
 *
 * Clerk's **test mode** is what makes this safe to automate: an address carrying the `+clerk_test`
 * subaddress never receives mail, and its verification code is fixed. The credential still comes
 * from the environment, never from this file — a committed password is a committed password whatever
 * instance it belongs to.
 */
setup("sign in", async ({ page }) => {
  const email = process.env.E2E_CLERK_EMAIL;
  const password = process.env.E2E_CLERK_PASSWORD;

  expect(
    email && password,
    "E2E_CLERK_EMAIL and E2E_CLERK_PASSWORD must be set — see .env.example",
  ).toBeTruthy();

  await page.goto("/sign-in");

  await page.getByLabel(/email/i).fill(email!);
  await page.getByRole("button", { name: /continue/i }).click();

  const passwordField = page.getByLabel(/password/i);
  await passwordField.waitFor({ state: "visible" });
  await passwordField.fill(password!);
  await page.getByRole("button", { name: /continue/i }).click();

  // Signed in is observable in the product, not in Clerk's own UI: the chat screen shows an account
  // row and a credits chip only to a session that has one.
  await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 30_000 });
  await page.goto("/chat");
  await expect(page.getByRole("button", { name: "Available credits" })).toBeVisible();

  mkdirSync(dirname(STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STATE_PATH });

  expect(existsSync(STATE_PATH)).toBe(true);
});
