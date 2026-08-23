import { expect, test as setup } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const STATE_PATH = "e2e/.auth/user.json";

/** Clerk's fixed verification code for test-mode addresses. Not a secret, and not a real account. */
const TEST_MODE_CODE = "424242";

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

  /**
   * Submitting with Enter rather than by button name: Clerk's social buttons carry a "Continue"
   * label of their own, so a name-matched click is ambiguous between them and the form's submit.
   */
  const identifier = page.getByLabel(/email/i).first();
  await identifier.fill(email!);
  await identifier.press("Enter");

  const passwordField = page.getByLabel(/password/i).first();
  await passwordField.waitFor({ state: "visible" });
  await passwordField.fill(password!);
  await passwordField.press("Enter");

  /**
   * Clerk may interpose a device-verification step (`/sign-in/client-trust`). A test-mode address
   * verifies with a fixed code rather than a real email, which is the whole reason test mode is what
   * makes this automatable.
   */
  const otp = page.locator('input[autocomplete="one-time-code"]').first();
  if (await otp.isVisible({ timeout: 8_000 }).catch(() => false)) {
    // `fill`, not per-key typing: the segmented field re-renders on each digit and drops keystrokes.
    await otp.fill(TEST_MODE_CODE);
  }

  /**
   * Signed in is asserted against the product, not against Clerk's routing: Clerk may interpose
   * steps of its own (`/sign-in/client-trust` on a new device), and the credits chip is the app's
   * own statement that a session exists.
   */
  await page.waitForTimeout(6_000);
  await page.goto("/chat");
  await expect(page.getByRole("button", { name: "Available credits" })).toBeVisible({
    timeout: 30_000,
  });

  mkdirSync(dirname(STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STATE_PATH });

  expect(existsSync(STATE_PATH)).toBe(true);
});
