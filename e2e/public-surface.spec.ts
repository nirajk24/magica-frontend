import { expect, test, type Page } from "@playwright/test";

/**
 * `getByLabel` matches substrings, and "Send message" contains "Message" — so the composer has to be
 * addressed by role to be unambiguous.
 */
const composer = (page: Page) => page.getByRole("textbox", { name: "Message" });

/**
 * The shell renders a bare spinner until Clerk resolves, and the global chords are bound by
 * components inside it — so nothing keyboard-driven works until the composer is on screen.
 */
async function shellReady(page: Page) {
  await expect(composer(page)).toBeVisible();
}

/**
 * The anonymous surface, in a real browser. Spends nothing, so it can run on every commit.
 *
 * These are the checks jsdom cannot make: the virtualized list needs real element heights, the
 * command palette needs a real focus trap, and the theme switch needs a real `startViewTransition`.
 * The unit suite asserts the same components against mocked HTTP; this asserts the app boots and
 * holds together with its own layout engine.
 */
test.describe("the anonymous surface", () => {
  test("serves the new-chat screen at /chat, not behind a redirect", async ({ page }) => {
    await page.goto("/chat");

    await expect(page).toHaveURL(/\/chat$/);
    await shellReady(page);
    await expect(page.getByRole("button", { name: /Sign in/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Available credits" })).toHaveCount(0);
  });

  test("redirects the root to the chat screen", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/chat$/);
  });

  /**
   * The guarantee is about the *send*, not about every read: the sidebar's list query is not gated
   * on the session, so an anonymous load does fire `GET /chats` and take a 401. What must never
   * happen is a message leaving without a token.
   */
  test("asks for an account on the first send instead of calling the API", async ({ page }) => {
    const sends: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/messages")) {
        sends.push(request.url());
      }
    });

    await page.goto("/chat");
    await shellReady(page);
    await composer(page).fill("this should not reach the server");
    await page.getByRole("button", { name: "Send message" }).click();

    // Clerk's own sign-in form, addressed by its field rather than its internal class names.
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    expect(sends, "an anonymous send must not reach the API").toEqual([]);
  });

  test("keeps the draft through the sign-in prompt, so the prompt is not retyped", async ({
    page,
  }) => {
    await page.goto("/chat");
    await shellReady(page);
    await composer(page).fill("a poster of a mountain");
    await page.getByRole("button", { name: "Send message" }).click();
    await page.getByLabel(/email/i).first().waitFor();
    await page.keyboard.press("Escape");

    await expect(composer(page)).toHaveValue("a poster of a mountain");
  });

  test("opens the command palette on its chord and closes it on Escape", async ({ page }) => {
    await page.goto("/chat");
    await shellReady(page);

    await page.keyboard.press("ControlOrMeta+k");

    const field = page.getByRole("combobox");
    await expect(field).toBeVisible();
    await expect(field).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(field).toHaveCount(0);
  });

  test("switches theme and keeps it across a reload", async ({ page }) => {
    await page.goto("/chat");

    await page.getByRole("button", { name: "More" }).click();
    await page.getByRole("button", { name: "Dark theme" }).click();

    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.reload();

    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
